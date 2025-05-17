import axios from 'axios';
import 'dotenv/config';

/**
 * Collection of functions to interact with Google Maps API
 */
const googleMapsApi = {
  /**
   * Gets directions between two locations
   * @param {string|Object} origin - Origin address or coordinates {lat, lng}
   * @param {string|Object} destination - Destination address or coordinates {lat, lng}
   * @param {string} mode - Travel mode (driving, walking, bicycling, transit)
   * @returns {Promise<Object>} - Route information
   */
  async getDirections(origin, destination, mode = 'driving') {
    if (!origin || !destination) {
      throw new Error('Origin and destination are required');
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    try {
      // First geocode locations if they're strings
      let originCoords = origin;
      let destinationCoords = destination;

      if (typeof origin === 'string') {
        const geocodedOrigin = await this.geocode(origin);
        if (geocodedOrigin && geocodedOrigin.geometry) {
          originCoords = `${geocodedOrigin.geometry.location.lat},${geocodedOrigin.geometry.location.lng}`;
        }
      } else if (origin.lat && origin.lng) {
        originCoords = `${origin.lat},${origin.lng}`;
      }

      if (typeof destination === 'string') {
        const geocodedDestination = await this.geocode(destination);
        if (geocodedDestination && geocodedDestination.geometry) {
          destinationCoords = `${geocodedDestination.geometry.location.lat},${geocodedDestination.geometry.location.lng}`;
        }
      } else if (destination.lat && destination.lng) {
        destinationCoords = `${destination.lat},${destination.lng}`;
      }

      // Now get directions
      const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
          origin: originCoords,
          destination: destinationCoords,
          mode: mode,
          alternatives: true, // Get multiple route options
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        console.error('Google Maps API error:', response.data);
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      // Format and summarize the response to include only essential information
      const routes = response.data.routes.map(route => {
        const legs = route.legs.map(leg => ({
          distance: leg.distance,
          duration: leg.duration,
          start_address: leg.start_address,
          end_address: leg.end_address,
          steps: leg.steps.map(step => ({
            distance: step.distance,
            duration: step.duration,
            instructions: step.html_instructions ? step.html_instructions.replace(/<[^>]*>/g, ' ') : '', // Remove HTML tags
            travel_mode: step.travel_mode,
            ...(step.transit_details && { transit_details: {
              departure_stop: step.transit_details.departure_stop.name,
              arrival_stop: step.transit_details.arrival_stop.name,
              line: step.transit_details.line.name || step.transit_details.line.short_name
            }})
          }))
        }));

        return {
          summary: route.summary,
          distance: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
          duration: route.legs.reduce((total, leg) => total + leg.duration.value, 0),
          legs
        };
      });

      return {
        status: response.data.status,
        origin: typeof origin === 'string' ? origin : 'Specified coordinates',
        destination: typeof destination === 'string' ? destination : 'Specified coordinates',
        travelMode: mode,
        routes,
        // Calculate environmental impact (simplified calculation)
        environmentalImpact: {
          co2Emissions: calculateCO2Emissions(routes[0].distance, mode),
          ecoFriendlyRating: calculateEcoRating(mode)
        }
      };
    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  },

  /**
   * Geocodes an address to coordinates
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} - Geocoded location
   */
  async geocode(address) {
    if (!address) {
      throw new Error('Address is required for geocoding');
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        console.error('Geocoding API error:', response.data);
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }

      return response.data.results[0];
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  },

  /**
   * Gets distance and duration between locations
   * @param {string|Object} origin - Origin address or coordinates {lat, lng}
   * @param {string|Object} destination - Destination address or coordinates {lat, lng}
   * @returns {Promise<Object>} - Distance information
   */
  async getDistance(origin, destination) {
    if (!origin || !destination) {
      throw new Error('Origin and destination are required');
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    try {
      let originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
      let destinationStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

      const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: originStr,
          destinations: destinationStr,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        console.error('Distance Matrix API error:', response.data);
        throw new Error(`Distance Matrix API error: ${response.data.status}`);
      }

      // Format the response
      const element = response.data.rows[0].elements[0];
      if (element.status !== 'OK') {
        throw new Error(`Route calculation error: ${element.status}`);
      }

      return {
        origin: response.data.origin_addresses[0],
        destination: response.data.destination_addresses[0],
        distance: element.distance,
        duration: element.duration
      };
    } catch (error) {
      console.error('Error getting distance:', error);
      throw error;
    }
  }
};

/**
 * Calculate approximate CO2 emissions based on distance and mode
 * @param {number} distanceMeters - Distance in meters
 * @param {string} mode - Travel mode
 * @returns {number} - CO2 emissions in grams
 */
function calculateCO2Emissions(distanceMeters, mode) {
  const distanceKm = distanceMeters / 1000;

  // CO2 emissions per km (in grams) - simplified estimates
  const emissionsPerKm = {
    driving: 120, // Average car
    walking: 0,
    bicycling: 0,
    transit: 50 // Average public transit
  };

  return distanceKm * (emissionsPerKm[mode] || emissionsPerKm.driving);
}

/**
 * Calculate eco-friendly rating on a scale of 1-10
 * @param {string} mode - Travel mode
 * @returns {number} - Eco-friendly rating
 */
function calculateEcoRating(mode) {
  const ratings = {
    driving: 3,
    walking: 10,
    bicycling: 9,
    transit: 7
  };

  return ratings[mode] || ratings.driving;
}

export default googleMapsApi;