/**
 * Functions for querying different database models based on question context
 */

/**
 * Query user-specific data
 */
export const getUserData = async (authenticatedUser, queryDatabase, sanitizeData) => {
  if (!authenticatedUser) return '';

  let userContext = '';

  try {
    const currentUser = await queryDatabase({
      model: 'Client',
      query: { _id: authenticatedUser },
      select: 'email phone firstName lastName active hasPreferences xp type favouritePlaces lastLocation',
      limit: 1
    });

    if (currentUser && currentUser.length > 0) {
      // Sanitize the user data
      const sanitizedUser = sanitizeData(currentUser[0]);
      userContext += `\n<current-user>\n${JSON.stringify(sanitizedUser, null, 2)}\n</current-user>`;
    }
  } catch (error) {
    console.error('Error getting user data:', error);
  }

  return userContext;
};

/**
 * Query user's alerts and notifications data
 */
export const getUserAlertsData = async (authenticatedUser, queryDatabase, sanitizeData) => {
  if (!authenticatedUser) return '';

  let alertsContext = '';

  try {
    // Get user's alerts and notifications
    const alerts = await queryDatabase({
      model: 'Alert',
      query: {
        user: authenticatedUser,
        // Include both read and unread alerts, but we'll categorize them
        // You could limit to only unread with: isRead: false
      },
      select: 'title message type priority isRead createdAt expiresAt relatedEntity actionRequired actionUrl',
      // Sort by createdAt descending (newest first)
      sort: '-createdAt',
      limit: 20
    });

    if (alerts && alerts.length > 0) {
      // Categorize alerts
      const unreadAlerts = alerts.filter(alert => !alert.isRead);
      const readAlerts = alerts.filter(alert => alert.isRead);

      // Group by priority
      const highPriorityAlerts = alerts.filter(alert => alert.priority === 'high');
      const mediumPriorityAlerts = alerts.filter(alert => alert.priority === 'medium');
      const lowPriorityAlerts = alerts.filter(alert => alert.priority === 'low');

      // Group by type
      const alertsByType = {};
      alerts.forEach(alert => {
        if (!alertsByType[alert.type]) {
          alertsByType[alert.type] = [];
        }
        alertsByType[alert.type].push(sanitizeData(alert));
      });

      // Create a summary
      const alertsSummary = {
        totalAlerts: alerts.length,
        unreadCount: unreadAlerts.length,
        readCount: readAlerts.length,
        highPriorityCount: highPriorityAlerts.length,
        mediumPriorityCount: mediumPriorityAlerts.length,
        lowPriorityCount: lowPriorityAlerts.length,
        alertTypes: Object.keys(alertsByType),

        // Provide the most recent unread alerts first
        unreadAlerts: unreadAlerts.map(alert => sanitizeData(alert)),

        // Also include recently read alerts for context
        recentlyReadAlerts: readAlerts.slice(0, 5).map(alert => sanitizeData(alert)),

        // Categorized alerts by type for easier reference
        alertsByType
      };

      alertsContext += `\n<user-alerts>\n${JSON.stringify(alertsSummary, null, 2)}\n</user-alerts>`;
    } else {
      // No alerts found
      alertsContext += `\n<user-alerts>\n${JSON.stringify({
        totalAlerts: 0,
        unreadCount: 0,
        alertTypes: [],
        unreadAlerts: [],
        recentlyReadAlerts: []
      }, null, 2)}\n</user-alerts>`;
    }

    // Get notification preferences to help answer questions about alert settings
    const notificationPreferences = await queryDatabase({
      model: 'NotificationPreference',
      query: { user: authenticatedUser },
      select: 'email push inApp byAlertType',
      limit: 1
    });

    if (notificationPreferences && notificationPreferences.length > 0) {
      const sanitizedPreferences = sanitizeData(notificationPreferences[0]);
      alertsContext += `\n<notification-preferences>\n${JSON.stringify(sanitizedPreferences, null, 2)}\n</notification-preferences>`;
    }

  } catch (error) {
    console.error('Error getting user alerts data:', error);
  }

  return alertsContext;
};

/**
 * Query user's friends data
 */
export const getUserFriendsData = async (authenticatedUser, queryDatabase, sanitizeData) => {
  if (!authenticatedUser) return '';

  let friendsContext = '';

  try {
    // Query user's friends relationship
    const friendships = await queryDatabase({
      model: 'Friendship',
      query: {
        $or: [
          { user1: authenticatedUser },
          { user2: authenticatedUser }
        ],
        status: 'accepted' // Only include confirmed friends
      },
      select: 'user1 user2 createdAt',
      limit: 20
    });

    if (friendships && friendships.length > 0) {
      // Get the friend IDs
      const friendIds = friendships.map(friendship => {
        // Determine which user ID is the friend
        return friendship.user1.toString() === authenticatedUser
          ? friendship.user2
          : friendship.user1;
      });

      // Get detailed information about friends
      const friends = await queryDatabase({
        model: 'Client',
        query: {
          _id: { $in: friendIds }
        },
        select: 'firstName lastName profilePicture active lastSeen lastLocation xp',
        limit: 20
      });

      if (friends && friends.length > 0) {
        // Get additional friend stats
        const friendsData = {
          totalFriends: friends.length,
          activeFriends: friends.filter(f => f.active).length,
          friends: friends.map(friend => {
            // Get only necessary information for each friend
            const sanitizedFriend = sanitizeData(friend);

            // Add friendship metadata
            const friendship = friendships.find(fs =>
              fs.user1.toString() === friend._id.toString() ||
              fs.user2.toString() === friend._id.toString()
            );

            return {
              ...sanitizedFriend,
              friendSince: friendship ? friendship.createdAt : null
            };
          })
        };

        friendsContext += `\n<user-friends>\n${JSON.stringify(friendsData, null, 2)}\n</user-friends>`;
      }

      // Get pending friend requests
      const pendingRequests = await queryDatabase({
        model: 'Friendship',
        query: {
          $or: [
            { user1: authenticatedUser, status: 'pending' },
            { user2: authenticatedUser, status: 'pending' }
          ]
        },
        select: 'user1 user2 status createdAt',
        limit: 10
      });

      if (pendingRequests && pendingRequests.length > 0) {
        // Separate sent and received requests
        const sentRequests = pendingRequests.filter(
          req => req.user1.toString() === authenticatedUser
        );

        const receivedRequests = pendingRequests.filter(
          req => req.user2.toString() === authenticatedUser
        );

        // Get user details for requests
        const requestUserIds = [
          ...sentRequests.map(req => req.user2),
          ...receivedRequests.map(req => req.user1)
        ];

        const requestUsers = await queryDatabase({
          model: 'Client',
          query: { _id: { $in: requestUserIds } },
          select: 'firstName lastName profilePicture',
          limit: 20
        });

        // Create sanitized request data
        const requestsData = {
          sent: sentRequests.map(req => {
            const user = requestUsers.find(u => u._id.toString() === req.user2.toString());
            return {
              requestId: req._id,
              user: user ? sanitizeData(user) : { _id: req.user2 },
              createdAt: req.createdAt
            };
          }),
          received: receivedRequests.map(req => {
            const user = requestUsers.find(u => u._id.toString() === req.user1.toString());
            return {
              requestId: req._id,
              user: user ? sanitizeData(user) : { _id: req.user1 },
              createdAt: req.createdAt
            };
          })
        };

        friendsContext += `\n<friend-requests>\n${JSON.stringify(requestsData, null, 2)}\n</friend-requests>`;
      }
    } else {
      // No friends found
      friendsContext += `\n<user-friends>\n${JSON.stringify({ totalFriends: 0, friends: [] }, null, 2)}\n</user-friends>`;
    }
  } catch (error) {
    console.error('Error getting user friends data:', error);
  }

  return friendsContext;
};

/**
 * Query badge progression data
 */
export const getBadgeProgressionData = async (authenticatedUser, queryDatabase, sanitizeData, userXp) => {
  if (!authenticatedUser) return '';

  let badgeContext = '';

  try {
    const badges = await queryDatabase({
      model: 'Badge',
      query: {},
      select: 'name description xpRequired icon',
      limit: 20
    });

    if (badges && badges.length > 0) {
      // Sort badges by XP required
      badges.sort((a, b) => a.xpRequired - b.xpRequired);

      // Find user's current badge and next badge
      let currentBadge = null;
      let nextBadge = null;

      for (let i = 0; i < badges.length; i++) {
        // Sanitize badge objects
        const sanitizedBadge = sanitizeData(badges[i]);

        if (userXp >= sanitizedBadge.xpRequired) {
          currentBadge = sanitizedBadge;
          if (i < badges.length - 1) {
            nextBadge = sanitizeData(badges[i + 1]);
          }
        } else {
          if (!nextBadge) {
            nextBadge = sanitizedBadge;
          }
          break;
        }
      }

      // Add badge progression info with sanitized badges
      const badgeProgressInfo = {
        userXp,
        currentBadge,
        nextBadge,
        xpUntilNextBadge: nextBadge ? nextBadge.xpRequired - userXp : 0,
        badges: badges.map(badge => sanitizeData(badge))
      };

      badgeContext += `\n<badge-progression>\n${JSON.stringify(badgeProgressInfo, null, 2)}\n</badge-progression>`;
    }
  } catch (error) {
    console.error('Error getting badge progression data:', error);
  }

  return badgeContext;
};

/**
 * Query user routes data
 */
export const getUserRoutesData = async (authenticatedUser, queryDatabase, sanitizeData) => {
  if (!authenticatedUser) return '';

  let routesContext = '';

  try {
    const userRoutes = await queryDatabase({
      model: 'CustomRoute',
      query: { user: authenticatedUser },
      select: 'origin destination travelMode distance duration createdAt',
      limit: 5
    });

    if (userRoutes && userRoutes.length > 0) {
      const sanitizedRoutes = userRoutes.map(route => sanitizeData(route));
      routesContext += `\n<user-routes>\n${JSON.stringify(sanitizedRoutes, null, 2)}\n</user-routes>`;
    }
  } catch (error) {
    console.error('Error getting user routes data:', error);
  }

  return routesContext;
};

/**
 * Query model data based on keywords
 */
export const getModelData = async (keywords, queryDatabase, sanitizeData) => {
  let modelContext = '';

  try {
    // Clients data
    if (keywords.includes('user') || keywords.includes('client') || keywords.includes('account')) {
      const clients = await queryDatabase({
        model: 'Client',
        limit: 5,
        select: 'active hasPreferences xp type', // Safe fields only
      });

      const sanitizedClients = clients.map(client => sanitizeData(client));
      modelContext += `\n<database-clients>\n${JSON.stringify(sanitizedClients, null, 2)}\n</database-clients>`;
    }

    // Routes data
    if (keywords.includes('route') || keywords.includes('path') || keywords.includes('travel')) {
      const routes = await queryDatabase({
        model: 'CustomRoute',
        limit: 5,
        select: 'travelMode distance duration',
      });

      const sanitizedRoutes = routes.map(route => sanitizeData(route));
      modelContext += `\n<database-routes>\n${JSON.stringify(sanitizedRoutes, null, 2)}\n</database-routes>`;
    }

    // Alerts data
    if (keywords.includes('alert') || keywords.includes('notification') ||
        keywords.includes('message') || keywords.includes('announce') ||
        keywords.includes('update') || keywords.includes('warning')) {
      const alerts = await queryDatabase({
        model: 'Alert',
        limit: 5,
        select: 'title message type priority isRead createdAt',
      });

      const sanitizedAlerts = alerts.map(alert => sanitizeData(alert));
      modelContext += `\n<database-alerts>\n${JSON.stringify(sanitizedAlerts, null, 2)}\n</database-alerts>`;
    }

    // Friends data
    if (keywords.includes('friend') || keywords.includes('connection') ||
        keywords.includes('contact') || keywords.includes('social')) {
      const friendships = await queryDatabase({
        model: 'Friendship',
        limit: 5,
        select: 'user1 user2 status createdAt',
      });

      const sanitizedFriendships = friendships.map(friendship => sanitizeData(friendship));
      modelContext += `\n<database-friendships>\n${JSON.stringify(sanitizedFriendships, null, 2)}\n</database-friendships>`;
    }

    // Conversations data
    if (keywords.includes('chat') || keywords.includes('message') || keywords.includes('conversation')) {
      const conversations = await queryDatabase({
        model: 'Conversation',
        limit: 3,
        select: 'lastMessageAt',
      });

      const sanitizedConversations = conversations.map(conversation => sanitizeData(conversation));
      modelContext += `\n<database-conversations>\n${JSON.stringify(sanitizedConversations, null, 2)}\n</database-conversations>`;
    }

    // Badges data
    if (keywords.includes('badge') || keywords.includes('achievement') || keywords.includes('reward')) {
      const badges = await queryDatabase({
        model: 'Badge',
        limit: 10,
        select: 'name description xpRequired icon',
      });

      const sanitizedBadges = badges.map(badge => sanitizeData(badge));
      modelContext += `\n<database-badges>\n${JSON.stringify(sanitizedBadges, null, 2)}\n</database-badges>`;
    }
  } catch (error) {
    console.error('Error querying model data:', error);
  }

  return modelContext;
};
