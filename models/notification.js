import { model, Schema } from 'mongoose';

/**
 *  Notifications are used to send notifications to users
 */
const name = 'notification';
const schema = new Schema(
  {
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    type: {
      type: String,
    },
    alert: {
      type: Schema.Types.ObjectId,
      ref: 'Alert',
    },
  },
  { timestamps: true }
);

export default model(name, schema);
