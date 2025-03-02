import { model, Schema } from 'mongoose';

/**
 * Badges are rewards earned by the clients
 */
const name = 'badge';
const schema = new Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    xpRequired: {
      type: Number,
    },
    image: {
      type: String,
    },
  },
  { autoCreate: false, timestamps: true }
);

export default model(name, schema);
