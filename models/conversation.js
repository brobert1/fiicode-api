import { model, Schema } from 'mongoose';

/**
 * Conversations represent a chat between clients
 */
const name = 'conversation';
const schema = new Schema(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'client',
      required: true
    }],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'message'
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

// Create a compound index for participants to quickly find conversations
schema.index({ participants: 1 });

export default model(name, schema);
