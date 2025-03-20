/* eslint-disable no-console */
import { Server } from 'ws';
import jwt from 'jsonwebtoken';
import { Client, Conversation, Message } from '../models';

let wss;
const clients = new Map(); // Map userId -> websocket connection
const ACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

/**
 * Initialize the WebSocket server
 * @param {object} server - HTTP server instance
 */
export const initWebSocketServer = (server) => {
  wss = new Server({ server, path: '/ws' }); // Set explicit path for WebSocket connections

  // Setup regular check for inactive users
  setInterval(checkInactiveUsers, 30000);

  wss.on('connection', async (ws, req) => {
    // Get token from query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication failed');
      return;
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.me;

      // Only allow client role
      if (decoded.role !== 'client') {
        ws.close(1008, 'Only clients can connect');
        return;
      }

      // Store the connection with the user ID
      clients.set(userId, ws);

      // Update user's online status and last activity time
      await Client.findByIdAndUpdate(userId, {
        isOnline: true,
        lastActiveAt: new Date(),
      });

      // Send initial online status to all friends
      await sendOnlineStatusToFriends(userId);

      // Handle message type
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          switch (data.type) {
            case 'heartbeat':
              // Update last activity time
              await Client.findByIdAndUpdate(userId, {
                lastActiveAt: new Date(),
              });
              break;

            case 'location_update':
              // Handle real-time location updates
              if (data.location) {
                // Update last location in database
                await Client.findByIdAndUpdate(userId, {
                  lastLocation: data.location,
                });
                // Broadcast location to friends
                await broadcastLocationToFriends(userId, data.location);
              }
              break;

            case 'read_messages':
              // Mark messages as read in a conversation
              if (data.conversationId) {
                await handleReadMessages(userId, data.conversationId);
              }
              break;

            case 'typing':
              // Notify others that user is typing
              if (data.conversationId) {
                await notifyTyping(userId, data.conversationId, true);
              }
              break;

            case 'stop_typing':
              // Notify others that user stopped typing
              if (data.conversationId) {
                await notifyTyping(userId, data.conversationId, false);
              }
              break;
          }
        } catch (error) {
          // Ignore invalid messages
          console.error('Invalid message received:', error);
        }
      });

      // Handle disconnect
      ws.on('close', async () => {
        clients.delete(userId);
        // We don't immediately set isOnline to false
        // Instead, we'll let the activity timeout check handle this
        // This way, quick page refreshes won't appear as going offline
      });

      // Setup heartbeat ping from server to client
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Send initial friend status to this user
      await sendFriendsStatusToUser(userId);
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  console.log('WebSocket server initialized');
};

/**
 * Check for inactive users and mark them as offline
 */
async function checkInactiveUsers() {
  try {
    const cutoffTime = new Date(Date.now() - ACTIVITY_TIMEOUT);

    // Find active users who haven't had activity in the timeout period
    const inactiveUsers = await Client.find({
      isOnline: true,
      lastActiveAt: { $lt: cutoffTime },
    });

    // Mark them as offline and notify friends
    for (const user of inactiveUsers) {
      user.isOnline = false;
      await user.save();

      // Notify friends about status change
      await broadcastStatusToFriends(user._id.toString(), false);
    }
  } catch (error) {
    console.error('Error checking inactive users:', error);
  }
}

/**
 * Handle marking messages as read
 * @param {string} userId - User marking messages as read
 * @param {string} conversationId - Conversation ID
 */
async function handleReadMessages(userId, conversationId) {
  try {
    // Update unread messages
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      {
        $addToSet: { readBy: userId }
      }
    );

    // Update conversation unread count
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (conversation) {
      const unreadCounts = conversation.unreadCounts || new Map();
      unreadCounts.set(userId, 0);
      await Conversation.updateOne(
        { _id: conversationId },
        { unreadCounts }
      );

      // Notify other participants
      const otherParticipants = conversation.participants.filter(
        p => p.toString() !== userId
      );

      for (const participantId of otherParticipants) {
        sendToUser(participantId.toString(), {
          type: 'messages_read',
          conversationId,
          readBy: userId
        });
      }
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Notify participants that a user is typing
 * @param {string} userId - The user who is typing
 * @param {string} conversationId - The conversation
 * @param {boolean} isTyping - Whether the user is typing or stopped typing
 */
async function notifyTyping(userId, conversationId, isTyping) {
  try {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) return;

    // Notify other participants
    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== userId
    );

    for (const participantId of otherParticipants) {
      sendToUser(participantId.toString(), {
        type: isTyping ? 'typing' : 'stop_typing',
        conversationId,
        userId
      });
    }
  } catch (error) {
    console.error('Error notifying typing status:', error);
  }
}

/**
 * Send the online status of a user to all their friends
 */
async function sendOnlineStatusToFriends(userId) {
  try {
    // Get user's friends
    const user = await Client.findById(userId);
    if (!user || !user.friends || !user.friends.length) return;

    // Send status update to each connected friend
    for (const friendId of user.friends) {
      const friendWs = clients.get(friendId.toString());
      if (friendWs && friendWs.readyState === friendWs.OPEN) {
        friendWs.send(
          JSON.stringify({
            type: 'status_update',
            userId: userId,
            isOnline: true,
          })
        );
      }
    }
  } catch (error) {
    console.error('Error sending online status to friends:', error);
  }
}

/**
 * Send the online status of all friends to a user
 */
async function sendFriendsStatusToUser(userId) {
  try {
    // Get user's friends
    const user = await Client.findById(userId).populate('friends');
    if (!user || !user.friends || !user.friends.length) return;

    const ws = clients.get(userId);
    if (!ws || ws.readyState !== ws.OPEN) return;

    // Send each friend's online status to the user
    for (const friend of user.friends) {
      ws.send(
        JSON.stringify({
          type: 'status_update',
          userId: friend._id.toString(),
          isOnline: friend.isOnline,
        })
      );
    }
  } catch (error) {
    console.error('Error sending friends status to user:', error);
  }
}

/**
 * Broadcast user's status to all their friends
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Is user online
 */
async function broadcastStatusToFriends(userId, isOnline) {
  try {
    // Get user's friends
    const user = await Client.findById(userId);
    if (!user || !user.friends || !user.friends.length) return;

    // Send status update to each connected friend
    for (const friendId of user.friends) {
      const friendWs = clients.get(friendId.toString());
      if (friendWs && friendWs.readyState === friendWs.OPEN) {
        friendWs.send(
          JSON.stringify({
            type: 'status_update',
            userId: userId,
            isOnline: isOnline,
          })
        );
      }
    }
  } catch (error) {
    console.error('Error broadcasting status:', error);
  }
}

/**
 * Broadcast user's location to all their friends
 * @param {string} userId - User ID
 * @param {object} location - User's location {lat, lng}
 */
async function broadcastLocationToFriends(userId, location) {
  try {
    // Get user's friends
    const user = await Client.findById(userId);
    if (!user || !user.friends || !user.friends.length) return;

    // Send location update to each connected friend
    for (const friendId of user.friends) {
      const friendWs = clients.get(friendId.toString());
      if (friendWs && friendWs.readyState === friendWs.OPEN) {
        friendWs.send(
          JSON.stringify({
            type: 'location_update',
            userId: userId,
            location: location,
          })
        );
      }
    }
  } catch (error) {
    console.error('Error broadcasting location to friends:', error);
  }
}

/**
 * Send a message to a specific user
 * @param {string} userId - User ID
 * @param {object} message - Message object
 */
export const sendToUser = (userId, message) => {
  const ws = clients.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
};

/**
 * Get all connected users
 * @returns {Array} Array of user IDs
 */
export const getConnectedUsers = () => {
  return Array.from(clients.keys());
};
