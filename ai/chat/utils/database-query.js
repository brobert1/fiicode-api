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
