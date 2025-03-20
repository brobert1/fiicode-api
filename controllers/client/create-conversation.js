import { error } from '@functions';
import { Client, Conversation } from '@models';
import mongoose from 'mongoose';

export default async (req, res) => {
  const { me } = req.user;
  const { participantId } = req.body;

  if (!participantId) {
    throw error(400, 'Missing required params');
  }

  // Validate participantId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(participantId)) {
    throw error(400, 'Invalid participant ID');
  }

  // Check if participant exists
  const participant = await Client.findById(participantId);
  if (!participant) {
    throw error(404, 'Participant not found');
  }

  // Check if conversation already exists
  const existingConversation = await Conversation.findOne({
    participants: { $all: [me, participantId] }
  }).populate({
    path: 'participants',
    select: 'name email image isOnline'
  });

  if (existingConversation) {
    return res.status(200).json(existingConversation);
  }

  // Create new conversation
  const newConversation = await Conversation.create({
    participants: [me, participantId],
    unreadCounts: new Map([[me, 0], [participantId, 0]])
  });

  // Populate participant details before returning
  const populatedConversation = await Conversation.findById(newConversation._id)
    .populate({
      path: 'participants',
      select: 'name email image isOnline'
    });

  res.status(201).json(populatedConversation);
};
