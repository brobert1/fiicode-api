import { Schema } from 'mongoose';
import Identity from './identity';

/**
 * Clients are normal accounts with no extended permissions
 */
const name = 'client';
const schema = new Schema({
  active: {
    type: Boolean,
    default: true,
  },
  phone: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
  },
  hasPreferences: {
    type: Boolean,
    default: false,
  },
  xp: {
    type: Number,
    default: 0,
  },
});

export default Identity.discriminator(name, schema);
