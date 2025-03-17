import { Notification } from '@models';
import { Schema } from 'mongoose';

const name = 'friendRequestNotification';
const schema = new Schema(
  {
    friendRequest: {
      type: Schema.Types.ObjectId,
      ref: 'friendRequest',
    },
  },
  { timestamps: true }
);

export default Notification.discriminator(name, schema);
