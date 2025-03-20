import { error } from '@functions';
import { Conversation, Message } from '@models';
import { sendToUser } from '../../services/websocket';
import mongoose from 'mongoose';

export default async (req, res) => {
  const { me } = req.user;
  const { conversationId } = req.params;

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

  // Update all unread messages in the conversation to be read by the current user
  const result = await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: me }, // Don't mark messages sent by the current user
      readBy: { $ne: me } // Only update if not already read
    },
    {
      $addToSet: { readBy: me }
    }
  );

  // Update unread count in conversation
  const unreadCounts = conversation.unreadCounts || new Map();
  unreadCounts.set(me.toString(), 0);
  await Conversation.updateOne(
    { _id: conversationId },
    { unreadCounts }
  );

  // Get the other participants in the conversation
  const otherParticipants = conversation.participants.filter(
    p => p.toString() !== me.toString()
  );

  // Notify other participants about the read status
  for (const participantId of otherParticipants) {
    sendToUser(participantId.toString(), {
      type: 'messages_read',
      conversationId,
      readBy: me
    });
  }

  res.status(200).json({
    success: true,
    messagesRead: result.modifiedCount
  });
};
