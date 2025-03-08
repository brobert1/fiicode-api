import { formatEmail, hashPasswords, paginate, validate } from 'express-goodies/mongoose';
import { model, Schema } from 'mongoose';
import validator from 'validator';
import { fcmToken } from './schemas';

/**
 * Identities manage login related operations
 */
const name = 'identity';
const schema = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: (value) => validator.isEmail(value),
      },
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: false,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    confirmedAt: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
    image: {
      name: String,
      path: String,
      size: Number,
    },
    fcmTokens: [fcmToken],
  },
  { autoCreate: false, timestamps: true }
);

// Set schema plugins
schema.plugin(formatEmail);
schema.plugin(hashPasswords);
schema.plugin(paginate);
schema.plugin(validate);

export default model(name, schema);
