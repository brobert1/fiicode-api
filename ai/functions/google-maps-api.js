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
          departure_time: 'now', // Add departure time to get traffic info
          traffic_model: 'best_guess', // Get traffic predictions
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
          duration_in_traffic: leg.duration_in_traffic, // Include traffic duration if available
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
          duration_in_traffic: route.legs.reduce((total, leg) => total + (leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value), 0),
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
          departure_time: 'now', // Include current time to get traffic info
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
        duration: element.duration,
        duration_in_traffic: element.duration_in_traffic
      };
    } catch (error) {
      console.error('Error getting distance:', error);
      throw error;
    }
  },

  /**
   * Gets place details including opening hours, contact info, etc.
   * @param {string} place - Place name or address to search for
   * @param {Object} [options] - Optional parameters
   * @param {boolean} [options.includeOpeningHours=true] - Whether to include opening hours
   * @param {boolean} [options.includeReviews=false] - Whether to include reviews
   * @param {boolean} [options.includePhotos=false] - Whether to include photos
   * @returns {Promise<Object>} - Place details
   */
  async getPlaceDetails(place, options = {}) {
    if (!place) {
      throw new Error('Place name or address is required');
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    const includeOpeningHours = options.includeOpeningHours !== false; // Default to true
    const includeReviews = options.includeReviews === true; // Default to false
    const includePhotos = options.includePhotos === true; // Default to false

    try {
      // First search for the place to get the place_id
      const searchResponse = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
        params: {
          input: place,
          inputtype: 'textquery',
          fields: 'place_id,name,formatted_address,geometry',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (searchResponse.data.status !== 'OK') {
        console.error('Place search API error:', searchResponse.data);
        throw new Error(`Place search API error: ${searchResponse.data.status}`);
      }

      if (searchResponse.data.candidates.length === 0) {
        throw new Error('No places found matching the search query');
      }

      const placeId = searchResponse.data.candidates[0].place_id;

      // Now get the place details
      let fields = 'name,formatted_address,geometry,url,website,formatted_phone_number,rating,user_ratings_total';

      if (includeOpeningHours) {
        fields += ',opening_hours,current_opening_hours,business_status';
      }

      if (includeReviews) {
        fields += ',reviews';
      }

      if (includePhotos) {
        fields += ',photos';
      }

      const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: placeId,
          fields: fields,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (detailsResponse.data.status !== 'OK') {
        console.error('Place details API error:', detailsResponse.data);
        throw new Error(`Place details API error: ${detailsResponse.data.status}`);
      }

      // Format the result
      const placeDetails = detailsResponse.data.result;

      // Check if it's currently open
      let isOpenNow = null;
      if (placeDetails.opening_hours) {
        isOpenNow = placeDetails.opening_hours.open_now;
      }

      // Format opening hours to be more readable
      let formattedOpeningHours = null;
      if (placeDetails.opening_hours && placeDetails.opening_hours.weekday_text) {
        formattedOpeningHours = placeDetails.opening_hours.weekday_text;
      }

      // Get today's schedule specially
      const today = new Date();
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = daysOfWeek[today.getDay()];

      let todaySchedule = null;
      if (formattedOpeningHours) {
        const todayEntry = formattedOpeningHours.find(entry => entry.startsWith(dayOfWeek));
        if (todayEntry) {
          todaySchedule = todayEntry.split(': ')[1]; // Remove the day prefix
        }
      }

      // Create a clean result object
      const result = {
        name: placeDetails.name,
        address: placeDetails.formatted_address,
        coordinates: placeDetails.geometry ? placeDetails.geometry.location : null,
        phone: placeDetails.formatted_phone_number || null,
        website: placeDetails.website || null,
        googleMapsUrl: placeDetails.url || null,
        rating: placeDetails.rating || null,
        totalRatings: placeDetails.user_ratings_total || null,
        businessStatus: placeDetails.business_status || null
      };

      // Add opening hours if available
      if (includeOpeningHours) {
        result.openingHours = {
          isOpenNow,
          formattedHours: formattedOpeningHours,
          todaySchedule,
          today: dayOfWeek
        };
      }

      // Add reviews if requested and available
      if (includeReviews && placeDetails.reviews) {
        result.reviews = placeDetails.reviews.slice(0, 3).map(review => ({
          author: review.author_name,
          rating: review.rating,
          time: new Date(review.time * 1000).toISOString(),
          text: review.text
        }));
      }

      // Add photo references if requested and available
      if (includePhotos && placeDetails.photos) {
        result.photos = placeDetails.photos.slice(0, 3).map(photo => ({
          reference: photo.photo_reference,
          width: photo.width,
          height: photo.height,
          attributions: photo.html_attributions
        }));
      }

      return result;
    } catch (error) {
      console.error('Error getting place details:', error);
      throw error;
    }
  },

  /**
   * Searches for places matching a query with optional filters
   * @param {string} query - The search query
   * @param {Object} [options] - Optional parameters
   * @param {Object} [options.location] - Location to search near {lat, lng}
   * @param {number} [options.radius=5000] - Search radius in meters (max 50000)
   * @param {string} [options.type] - Place type (e.g., 'restaurant', 'museum', 'cafe')
   * @param {boolean} [options.openNow] - Only return places that are open now
   * @returns {Promise<Array>} - Array of places matching the query
   */
  async searchPlaces(query, options = {}) {
    if (!query) {
      throw new Error('Search query is required');
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    try {
      // Prepare request parameters
      const params = {
        query: query,
        key: process.env.GOOGLE_MAPS_API_KEY
      };

      // Add location-based search if provided
      if (options.location) {
        params.location = `${options.location.lat},${options.location.lng}`;
        params.radius = options.radius || 5000; // Default to 5km
      }

      // Add type filter if provided
      if (options.type) {
        params.type = options.type;
      }

      // Add open now filter if requested
      if (options.openNow === true) {
        params.opennow = true;
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: params
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.error('Place search API error:', response.data);
        throw new Error(`Place search API error: ${response.data.status}`);
      }

      if (response.data.results.length === 0) {
        return [];
      }

      // Format results to include essential information
      const places = response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        location: place.geometry ? place.geometry.location : null,
        rating: place.rating || null,
        userRatingsTotal: place.user_ratings_total || null,
        openNow: place.opening_hours ? place.opening_hours.open_now : null,
        businessStatus: place.business_status || null,
        types: place.types || [],
        // Include a function to easily get detailed info later
        getDetails: async () => this.getPlaceDetails(place.place_id)
      }));

      return places;
    } catch (error) {
      console.error('Error searching for places:', error);
      throw error;
    }
  },

  /**
   * Gets traffic information for a location or street
   * @param {string} location - Location or street name
   * @returns {Promise<Object>} - Traffic information
   */
  async getTrafficInfo(location) {
    if (!location) {
      throw new Error('Location is required for traffic information');
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    try {
      // First geocode the location to get coordinates
      const geocoded = await this.geocode(location);

      if (!geocoded || !geocoded.geometry) {
        throw new Error('Could not geocode the specified location');
      }

      const { lat, lng } = geocoded.geometry.location;

      // Create several points along the road to check traffic
      // This is a simplified approach - for a real implementation, we'd need to get the
      // actual road geometry from the Roads API, but this gives us some basic traffic info
      const points = [
        { lat, lng }, // Original point
        { lat: lat + 0.001, lng: lng + 0.001 }, // Small offset to get nearby points
        { lat: lat - 0.001, lng: lng - 0.001 }
      ];

      // Get traffic data by checking travel times between nearby points
      const trafficData = {
        location: geocoded.formatted_address,
        coordinates: { lat, lng },
        currentConditions: {},
        timestamp: new Date().toISOString()
      };

      // Get distance and duration with traffic between points
      const trafficRequest = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: `${points[0].lat},${points[0].lng}`,
          destinations: `${points[1].lat},${points[1].lng}|${points[2].lat},${points[2].lng}`,
          mode: 'driving',
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (trafficRequest.data.status !== 'OK') {
        throw new Error(`Traffic API error: ${trafficRequest.data.status}`);
      }

      // Calculate traffic conditions
      const elements = trafficRequest.data.rows[0].elements;
      let trafficFactor = 1.0; // Default - normal traffic

      for (const element of elements) {
        if (element.status === 'OK' && element.duration && element.duration_in_traffic) {
          // Compare actual travel time vs expected travel time without traffic
          const ratio = element.duration_in_traffic.value / element.duration.value;
          trafficFactor = Math.max(trafficFactor, ratio);
        }
      }

      // Interpret traffic conditions
      let trafficLevel;
      let description;

      if (trafficFactor < 1.1) {
        trafficLevel = 'light';
        description = 'Traffic is flowing smoothly with minimal delays.';
      } else if (trafficFactor < 1.3) {
        trafficLevel = 'moderate';
        description = 'Some traffic, but still moving reasonably well.';
      } else if (trafficFactor < 1.6) {
        trafficLevel = 'heavy';
        description = 'Heavy traffic conditions with noticeable delays.';
      } else {
        trafficLevel = 'severe';
        description = 'Severe congestion with significant delays.';
      }

      // Add to response
      trafficData.currentConditions = {
        trafficLevel,
        description,
        trafficFactor,
        timestamp: new Date().toISOString()
      };

      // Get additional road information
      const nearbyRoads = await this.getNearbyStreets(location);
      if (nearbyRoads && nearbyRoads.length > 0) {
        trafficData.nearbyStreets = nearbyRoads;
      }

      return trafficData;
    } catch (error) {
      console.error('Error getting traffic information:', error);
      throw error;
    }
  },

  /**
   * Gets nearby streets information (simplified version)
   * @param {string} location - Location to find nearby streets
   * @returns {Promise<Array>} - Nearby streets information
   */
  async getNearbyStreets(location) {
    try {
      // First geocode the location
      const geocoded = await this.geocode(location);

      if (!geocoded || !geocoded.geometry) {
        throw new Error('Could not geocode the specified location');
      }

      const { lat, lng } = geocoded.geometry.location;

      // Use Places API to get nearby roads
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: `${lat},${lng}`,
          radius: 300,
          type: 'route',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        console.error('Nearby streets API error:', response.data);
        return [];
      }

      // Extract relevant information
      return response.data.results.map(place => ({
        name: place.name,
        vicinity: place.vicinity
      }));
    } catch (error) {
      console.error('Error getting nearby streets:', error);
      return [];
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
