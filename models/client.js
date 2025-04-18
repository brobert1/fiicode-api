import { Schema } from 'mongoose';
import Identity from './identity';
import { favouritePlaces } from './schemas';

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
  type: {
    type: String,
    enum: ['google', 'default'],
  },
  favouritePlaces: [favouritePlaces],
  friends: [
    {
      type: Schema.Types.ObjectId,
      ref: 'client',
    },
  ],
  lastLocation: {
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
});

export default Identity.discriminator(name, schema);
