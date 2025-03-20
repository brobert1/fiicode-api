import { error } from '@functions';
import { Conversation, Message, Client } from '@models';
import { sendToUser } from '../../services/websocket';
import mongoose from 'mongoose';
import admin from 'firebase-admin';

export default async (req, res) => {
  const { me } = req.user;
  const { conversationId, content } = req.body;

  if (!conversationId || !content) {
    throw error(400, 'Missing required params');
  }

  // Validate conversationId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw error(400, 'Invalid conversation ID');
  }

  // Check if the conversation exists and user is a participant
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: me
  });

  if (!conversation) {
    throw error(404, 'Conversation not found or you are not a participant');
  }

  // Create a new message
  const message = await Message.create({
    conversation: conversationId,
    sender: me,
    content,
    readBy: [me] // Mark as read by sender
  });

  // Populate the message with sender details
  const populatedMessage = await Message.findById(message._id).populate({
    path: 'sender',
    select: 'name email image'
  });

  // Update conversation with lastMessage and lastMessageAt
  const otherParticipants = conversation.participants.filter(
    p => p.toString() !== me.toString()
  );

  // Update unread counts for other participants
  const unreadCounts = conversation.unreadCounts || new Map();

  for (const participantId of otherParticipants) {
    const participantIdStr = participantId.toString();
    const currentCount = unreadCounts.get(participantIdStr) || 0;
    unreadCounts.set(participantIdStr, currentCount + 1);
  }

  await Conversation.updateOne(
    { _id: conversationId },
    {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      unreadCounts
    }
  );

  // Send real-time notification to other participants via WebSocket
  for (const participantId of otherParticipants) {
    sendToUser(participantId.toString(), {
      type: 'new_message',
      message: populatedMessage,
      conversationId
    });

    // Send push notifications to participant's devices
    try {
      // Find the client with their FCM tokens
      const participant = await Client.findById(participantId);

      if (participant && participant.fcmTokens && participant.fcmTokens.length > 0) {
        // Get sender info for notification
        const sender = await Client.findById(me, 'name');

        // Create notification messages for each device token
        const messages = participant.fcmTokens.map(tokenObj => ({
          notification: {
            title: `${sender.name}`,
            body: `${content.length > 50 ? content.substring(0, 47) + '...' : content}`
          },
          data: {
            conversationId: conversationId.toString(),
            messageId: message._id.toString(),
            type: 'new_message'
          },
          token: tokenObj.token
        }));

        if (messages.length > 0) {
          await admin.messaging().sendEach(messages);
        }
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      // Continue execution even if push notification fails
    }
  }

  res.status(201).json(populatedMessage);
};
