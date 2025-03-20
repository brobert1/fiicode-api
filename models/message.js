import { model, Schema } from 'mongoose';

/**
 * Messages are sent between clients in a conversation
 */
const name = 'message';
const schema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'conversation',
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'client',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'client'
    }]
  },
  { timestamps: true }
);

// Create indexes to speed up common queries
schema.index({ conversation: 1, createdAt: -1 });
schema.index({ sender: 1 });

export default model(name, schema);
