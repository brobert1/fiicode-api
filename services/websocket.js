import { Server } from 'ws';
import jwt from 'jsonwebtoken';
import { Client } from '../models';

let wss;
const clients = new Map(); // Map userId -> websocket connection

/**
 * Initialize the WebSocket server
 * @param {object} server - HTTP server instance
 */
export const initWebSocketServer = (server) => {
  wss = new Server({ server });

  wss.on('connection', async (ws, req) => {
    // Get token from query parameters
    const url = new URL(req.url, 'http://localhost');
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

      // Update user's online status
      await Client.findByIdAndUpdate(userId, { isOnline: true });

      // Broadcast online status to friends
      broadcastStatusToFriends(userId, true);

      // Handle disconnect
      ws.on('close', async () => {
        clients.delete(userId);
        await Client.findByIdAndUpdate(userId, { isOnline: false });
        broadcastStatusToFriends(userId, false);
      });

      // Keep-alive ping
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  console.log('WebSocket server initialized');
};

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
        friendWs.send(JSON.stringify({
          type: 'status_update',
          userId: userId,
          isOnline: isOnline
        }));
      }
    }
  } catch (error) {
    console.error('Error broadcasting status:', error);
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
