import { error } from '@functions';
import { Conversation, Message } from '@models';
import mongoose from 'mongoose';

export default async (req, res) => {
  const { me } = req.user;
  const { conversationId } = req.params;
  const { limit = 50, before } = req.query;

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

  // Build query for messages with pagination
  const query = { conversation: conversationId };

  // If 'before' is provided, get messages created before that timestamp
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  // Get messages for the conversation
  const messages = await Message.find(query)
    .populate({
      path: 'sender',
      select: 'name email image'
    })
    .sort({ createdAt: -1 }) // Newest messages first
    .limit(parseInt(limit));

  // Mark messages as read
  const messageIds = messages.map(message => message._id);

  if (messageIds.length > 0) {
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        sender: { $ne: me }, // Don't mark the user's own messages
        readBy: { $ne: me } // Only update if not already read
      },
      { $addToSet: { readBy: me } }
    );

    // Update unread count in conversation
    const unreadCounts = conversation.unreadCounts || new Map();
    unreadCounts.set(me.toString(), 0);
    await Conversation.updateOne(
      { _id: conversationId },
      { unreadCounts }
    );
  }

  res.status(200).json({
    data: messages,
    pagination: {
      hasMore: messages.length === parseInt(limit),
      nextBefore: messages.length > 0 ? messages[messages.length - 1].createdAt.toISOString() : null
    }
  });
};
