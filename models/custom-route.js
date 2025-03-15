import { model, Schema } from 'mongoose';
import { destinationSchema, originSchema, routePathSchema } from './schemas';

/**
 *  Custom routes are used to store custom routes
 */
const name = 'customRoute';
const schema = new Schema(
  {
    origin: originSchema,
    destination: destinationSchema,
    travelMode: {
      type: String,
    },
    routePath: [routePathSchema],
    // Add distance in meters
    distance: {
      type: Number,
      default: 0
    },
    // Add duration in seconds
    duration: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default model(name, schema);
