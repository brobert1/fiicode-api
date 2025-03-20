import { error } from '@functions';
import { Conversation } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  // Find all conversations where the user is a participant
  const conversations = await Conversation.find({
    participants: me
  })
    .populate({
      path: 'participants',
      select: 'name email image isOnline'
    })
    .populate({
      path: 'lastMessage',
      select: 'content createdAt readBy'
    })
    .sort({ lastMessageAt: -1 }) // Sort by most recent message
    .limit(50); // Limit to 50 most recent conversations

  // Calculate unread count for each conversation
  const conversationsWithMetadata = conversations.map(conversation => {
    const conv = conversation.toObject();

    // Get unread count for current user
    const unreadCount = conv.unreadCounts && conv.unreadCounts.get(me.toString()) || 0;

    // Add unread count to response
    return {
      ...conv,
      unreadCount
    };
  });

  res.status(200).json(conversationsWithMetadata);
};
