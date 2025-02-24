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
});

export default Identity.discriminator(name, schema);
