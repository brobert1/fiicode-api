import { Notification } from '@models';
import { Schema } from 'mongoose';

const name = 'alertNotification';
const schema = new Schema(
  {
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

export default Notification.discriminator(name, schema);
