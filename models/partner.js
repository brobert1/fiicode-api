import { paginate, validate } from 'express-goodies/mongoose';
import { model, Schema } from 'mongoose';

/**
 *  Partners are used to store ride sharing partners
 */
const name = 'partner';
const schema = new Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    website: {
      type: String,
    },
    image: {
      type: String,
    },
    deep_link: {
      type: String,
    },
  },
  { autoCreate: false, timestamps: true }
);

// Set schema plugins
schema.plugin(paginate);
schema.plugin(validate);

export default model(name, schema);
