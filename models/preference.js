import { model, Schema } from 'mongoose';

/**
 * Preferences are used to determin user preferences
 */
const name = 'preference';
const schema = new Schema({
  identity: {
    type: Schema.Types.ObjectId,
    ref: 'identity',
  },
  favouriteTransportation: {
    type: String,
  },
  avoidedTransportation: {
    type: String,
  },
  transportationSubscription: {
    type: Boolean,
  },
  preferredRoute: {
    type: String,
  },
  usualRoute: {
    type: Boolean,
  },
  routeHours: {
    type: String,
  },
  routesAlerts: {
    type: Boolean,
  },
});

export default model(name, schema);
