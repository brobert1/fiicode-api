import { Schema, model } from 'mongoose';

const name = 'friendRequest';
const schema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'client',
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'client',
    },
    status: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default model(name, schema);
