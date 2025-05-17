import { paginate } from 'express-goodies/mongoose';
import { model, Schema } from 'mongoose';

/**
 * Alerts are reported by the clients or admin
 */
const name = 'alert';
const schema = new Schema(
  {
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
      address: {
        type: String,
      },
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'identity',
    },
    type: {
      type: String,
      enum: ['accident', 'construction', 'congestion', 'other', 'noise'],
    },
    noiseLevel: {
      type: Number,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // Default 10 minutes from now
    },
  },
  { autoCreate: false, timestamps: true }
);

schema.plugin(paginate);

export default model(name, schema);
