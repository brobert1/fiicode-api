import googleMapsApi from '../../functions/google-maps-api.js';

/**
 * Collection of functions for handling navigation-related queries
 */

/**
 * Determines if a question is navigation-related
 */
export const isNavigationQuestion = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Check first if it's a traffic-related query
  if (isTrafficQuestion(lowerQuestion)) {
    return true;
  }

  // Detect "from X to Y" patterns even without specific navigation keywords
  const fromToPattern = /from\s+([^,\.]+?)(?:\s+to|\s+and)\s+([^?\.,\"]+)/i;
  const toFromPattern = /to\s+([^,\.]+?)\s+from\s+([^?\.,\"]+)/i;
  if (fromToPattern.test(lowerQuestion) || toFromPattern.test(lowerQuestion)) {
    return true;
  }

  // Direct questions about getting somewhere
  if (/how\s+(?:do|can|would|could|should|might)\s+(?:i|we|you|one|someone)?\s+(?:get|go|travel|commute|drive|walk|bike|reach|arrive)/i.test(lowerQuestion)) {
    return true;
  }

  // Questions about alternatives or options
  if (/(?:alternative|option|way|method|mean|mode)\s+(?:of|for)?\s+(?:transport|transportation|travel|getting|reaching)/i.test(lowerQuestion)) {
    return true;
  }

  // General transportation questions
  if (/(?:bus|train|subway|car|bike|walk|taxi|uber|lyft|transit|public\s+transport|transportation|route)/i.test(lowerQuestion) &&
      (/(?:to|from|between|schedule|time|how)/i.test(lowerQuestion))) {
    return true;
  }

  // Distance or duration queries
  if (/(?:how\s+(?:far|long|much\s+time)|distance|duration|time\s+(?:to|it\s+takes))/i.test(lowerQuestion)) {
    return true;
  }

  // Eco-friendly route options (central to Pathly's mission)
  if (/(?:eco|green|environmentally\s+friendly|sustainable)\s+(?:route|path|option|way|transport|travel)/i.test(lowerQuestion)) {
    return true;
  }

  return false;
};

/**
 * Determines if a question is about traffic conditions
 */
export const isTrafficQuestion = (question) => {
  const lowerQuestion = typeof question === 'string' ? question.toLowerCase() : '';

  // Direct traffic condition queries
  if (/(?:how\s+is|what\s+is|check|tell\s+me\s+about)\s+(?:the\s+)?traffic/i.test(lowerQuestion)) {
    return true;
  }

  // Traffic specifically on a street/road/boulevard/etc.
  if (/traffic\s+(?:on|in|at|near|around)\s+/i.test(lowerQuestion)) {
    return true;
  }

  // Traffic conditions, congestion, jams
  if (/(?:traffic\s+conditions|congestion|traffic\s+jam|heavy\s+traffic|busy\s+road|busy\s+traffic)/i.test(lowerQuestion)) {
    return true;
  }

  // Time estimates with traffic
  if (/(?:how\s+long|time|duration).{1,30}?(?:with|in|considering)\s+traffic/i.test(lowerQuestion)) {
    return true;
  }

  // Traffic at specific time
  if (/traffic.{1,20}?(?:now|today|this\s+morning|this\s+afternoon|this\s+evening|tonight|current)/i.test(lowerQuestion)) {
    return true;
  }

  return false;
};

/**
 * Extract location for traffic query
 */
export const extractTrafficLocation = (question) => {
  // Extract location after "traffic on/in/at/near"
  const trafficOnPattern = /traffic\s+(?:on|in|at|near|around)\s+([^?.,\"]+)/i;
  const onTrafficPattern = /(?:on|in|at|near|around)\s+([^?.,\"]+)\s+traffic/i;

  // Try the most common pattern first
  let match = question.match(trafficOnPattern);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Try alternate pattern
  match = question.match(onTrafficPattern);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Look for location names in Romania that might be the subject
  // This is a simplified approach - in a real system, you'd have a more robust NER system
  const romanianKeywords = [
    'strada', 'bulevardul', 'calea', 'șoseaua', 'piața',
    'Bucharest', 'București', 'Cluj', 'Timișoara', 'Iași', 'Constanța',
    'Brașov', 'Galați', 'Craiova', 'Ploiești', 'Oradea'
  ];

  for (const keyword of romanianKeywords) {
    const regex = new RegExp(`(${keyword}\\s+[^?.,\"]*)`);
    match = question.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

/**
 * Extract origin and destination from various question formats
 * Also handles incomplete specifications where only one location is provided
 */
export const extractLocations = (question) => {
  // Common patterns for complete origin-destination pairs
  const patterns = [
    // "from X to Y" - most common pattern
    /from\s+([^,\.]+?)(?:\s+to|\s+and)\s+([^?\.,\"]+)/i,

    // "to Y from X" - reversed pattern
    /to\s+([^,\.]+?)\s+from\s+([^?\.,\"]+)/i,

    // "between X and Y" pattern
    /between\s+([^,\.]+?)\s+and\s+([^?\.,\"]+)/i,

    // "how to get to Y" (assumes current location as origin)
    /how\s+(?:to|do\s+i|can\s+i|would\s+i)?\s+(?:get|go|travel|drive|walk|bike)\s+to\s+([^?\.,\"]+)/i,
  ];

  // Try to match complete patterns first
  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match) {
      // Handle reversed patterns
      if (pattern.toString().includes('to\\s+([^,\\.]+?)\\s+from')) {
        // "to Y from X" format
        return {
          origin: match[2].trim(),
          destination: match[1].trim()
        };
      } else if (pattern.toString().includes('how\\s+(?:to|do\\s+i|can\\s+i|would\\s+i)?\\s+(?:get|go|travel|drive|walk|bike)\\s+to')) {
        // "How to get to Y" format (uses current location as origin)
        return {
          origin: "current location",
          destination: match[1].trim()
        };
      } else {
        // Standard "from X to Y" or "between X and Y" format
        return {
          origin: match[1].trim(),
          destination: match[2].trim()
        };
      }
    }
  }

  // If we couldn't find a complete pattern, look for partial location specifications
  // Patterns for destination-only queries
  const destinationOnlyPatterns = [
    // Direct mention of a place without origin
    /(?:take\s+me\s+to|directions\s+to|navigate\s+to|route\s+to|go\s+to)\s+([^?\.,\"]+)/i,

    // Questions like "where is X" or "how far is X"
    /(?:where\s+is|how\s+far\s+is|how\s+long\s+to|directions\s+for)\s+([^?\.,\"]+)/i,

    // Simple place name with navigation intent
    /navigate\s+([^?\.,\"]+)/i
  ];

  for (const pattern of destinationOnlyPatterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      return {
        origin: "current location", // Assume current location as origin
        destination: match[1].trim()
      };
    }
  }

  // Patterns for origin-only queries
  const originOnlyPatterns = [
    // Direct mention of starting point without destination
    /(?:starting\s+from|leaving\s+from|departing\s+from|from)\s+([^?\.,\"]+)/i,

    // Questions like "routes from X" or "directions from X"
    /(?:routes|directions|paths|ways)\s+from\s+([^?\.,\"]+)/i
  ];

  for (const pattern of originOnlyPatterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      return {
        origin: match[1].trim(),
        destination: "unspecified" // Mark that we need a destination
      };
    }
  }

  return null;
};

/**
 * Determine travel modes with Romania-specific options
 */
export const determineTravelModes = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Default is to check all modes for comparison
  const allModes = ['driving', 'walking', 'transit']; // Note: bicycling directions in Google Maps have limited support in Romania

  // If specific modes are mentioned, prioritize those
  const requestedModes = [];

  if (lowerQuestion.includes('walk') || lowerQuestion.includes('on foot') || lowerQuestion.includes('walking')) {
    requestedModes.push('walking');
  }

  if (lowerQuestion.includes('bike') || lowerQuestion.includes('cycling') || lowerQuestion.includes('bicycle')) {
    requestedModes.push('bicycling'); // Include but with caution for Romania
  }

  if (lowerQuestion.includes('transit') || lowerQuestion.includes('bus') ||
      lowerQuestion.includes('train') || lowerQuestion.includes('subway') ||
      lowerQuestion.includes('public transport') || lowerQuestion.includes('metro') ||
      // Add Romania-specific transit keywords
      lowerQuestion.includes('cfr') || lowerQuestion.includes('metrou') ||
      lowerQuestion.includes('tramvai') || lowerQuestion.includes('troleibuz') ||
      lowerQuestion.includes('stb') || lowerQuestion.includes('ratb')) {
    requestedModes.push('transit');
  }

  if (lowerQuestion.includes('car') || lowerQuestion.includes('drive') ||
      lowerQuestion.includes('driving') || lowerQuestion.includes('uber') ||
      lowerQuestion.includes('taxi') || lowerQuestion.includes('bolt') ||
      lowerQuestion.includes('masina')) {
    requestedModes.push('driving');
  }

  // For eco-friendly requests, prioritize green options available in Romania
  if (lowerQuestion.includes('eco') || lowerQuestion.includes('green') ||
      lowerQuestion.includes('environment') || lowerQuestion.includes('sustainable')) {
    // Eco modes in order of preference for Romania
    return requestedModes.length > 0 ? requestedModes : ['walking', 'transit', 'driving'];
  }

  // For "best" or "fastest" route, include main Romanian options
  if (lowerQuestion.includes('best') || lowerQuestion.includes('fastest') ||
      lowerQuestion.includes('quickest') || lowerQuestion.includes('shortest') ||
      lowerQuestion.includes('options') || lowerQuestion.includes('alternatives')) {
    return requestedModes.length > 0 ? requestedModes : allModes;
  }

  return requestedModes.length > 0 ? requestedModes : ['driving']; // Default to driving if no mode specified
};

/**
 * Process traffic-related query and get traffic information
 */
export const processTrafficQuery = async (question, authenticatedUser, queryDatabase) => {
  let trafficContext = '';

  // Extract location from the traffic question
  let location = extractTrafficLocation(question);

  // If no location is specified in the query, try to use the user's last known location
  if (!location && authenticatedUser) {
    try {
      const currentUser = await queryDatabase({
        model: 'Client',
        query: { _id: authenticatedUser },
        select: 'lastLocation',
        limit: 1
      });

      if (currentUser && currentUser.length > 0 && currentUser[0].lastLocation) {
        const userLastLocation = currentUser[0].lastLocation;

        // If lastLocation has lat/lng, we need to geocode it to get a street name
        if (userLastLocation.lat && userLastLocation.lng) {
          try {
            // Reverse geocode the coordinates to get an address
            const geocoded = await googleMapsApi.geocode(
              `${userLastLocation.lat},${userLastLocation.lng}`
            );

            if (geocoded && geocoded.formatted_address) {
              location = geocoded.formatted_address;
              trafficContext += `\n<location-notice>Using your last known location: ${location}</location-notice>`;
            }
          } catch (error) {
            console.error('Error reverse geocoding lastLocation:', error);
          }
        } else if (typeof userLastLocation === 'string') {
          // If lastLocation is already a string address
          location = userLastLocation;
          trafficContext += `\n<location-notice>Using your last known location: ${location}</location-notice>`;
        }
      }
    } catch (error) {
      console.error('Error fetching user location:', error);
    }
  }

  if (location) {
    console.log("Using location for traffic query:", location);

    try {
      // Get traffic information for the location
      const trafficInfo = await googleMapsApi.getTrafficInfo(location);

      if (trafficInfo) {
        trafficContext += `\n<traffic-info>\n${JSON.stringify(trafficInfo, null, 2)}\n</traffic-info>`;
      }
    } catch (error) {
      console.error('Error with traffic query:', error);
      trafficContext += `\n<traffic-error>Failed to retrieve traffic information: ${error.message}. Please ensure the location is valid and try again with a more specific location name.</traffic-error>`;
    }
  } else {
    trafficContext += `\n<traffic-error>I couldn't determine your location for traffic information. Please specify a street, area, or location, for example: "How is the traffic on Bulevardul Unirii?"</traffic-error>`;
  }

  return trafficContext;
};

/**
 * Handle navigation question and get relevant data
 */
export const processNavigationQuery = async (question, authenticatedUser, queryDatabase) => {
  let navigationContext = '';

  // Check if this is a traffic-related query
  if (isTrafficQuestion(question)) {
    console.log("Processing as traffic query");
    return processTrafficQuery(question, authenticatedUser, queryDatabase);
  }

  const locations = extractLocations(question);

  if (locations) {
    console.log("Extracted locations:", locations);

    // Handle incomplete location specifications
    if (locations.origin === "current location" || locations.destination === "unspecified") {
      // We need to get the user's location from database
      if (authenticatedUser) {
        try {
          const currentUser = await queryDatabase({
            model: 'Client',
            query: { _id: authenticatedUser },
            select: 'lastLocation favoriteLocations',
            limit: 1
          });

          // Process current location
          if (locations.origin === "current location" && currentUser && currentUser.length > 0 && currentUser[0].lastLocation) {
            locations.origin = currentUser[0].lastLocation;
            console.log("Using user's last known location as origin:", locations.origin);
            navigationContext += `\n<location-notice>Using your last known location as starting point</location-notice>`;
          }

          // Handle unspecified destination - in a real app, you might suggest popular or favorite destinations
          if (locations.destination === "unspecified" && currentUser && currentUser.length > 0) {
            // Check if user has favorite locations
            if (currentUser[0].favoriteLocations && currentUser[0].favoriteLocations.length > 0) {
              // Use the most recent or first favorite location as destination
              const suggestedDestination = currentUser[0].favoriteLocations[0];
              locations.destination = suggestedDestination.address || suggestedDestination;
              navigationContext += `\n<location-notice>I'm using one of your favorite locations (${locations.destination}) as destination. Please specify if you want to go somewhere else.</location-notice>`;
            } else {
              // No favorite locations - use a popular location or prompt user
              navigationContext += `\n<navigation-error>I need to know where you want to go. Please specify a destination.</navigation-error>`;
              return navigationContext;
            }
          }
        } catch (error) {
          console.error('Error fetching user location data:', error);
          if (locations.origin === "current location") {
            navigationContext += `\n<navigation-error>I don't have your current location. Please specify an origin point.</navigation-error>`;
          }
          if (locations.destination === "unspecified") {
            navigationContext += `\n<navigation-error>I need to know where you want to go. Please specify a destination.</navigation-error>`;
          }
          return navigationContext;
        }
      } else {
        // Not authenticated, can't get location from database
        if (locations.origin === "current location") {
          navigationContext += `\n<navigation-error>I don't have your current location. Please specify an origin point.</navigation-error>`;
        }
        if (locations.destination === "unspecified") {
          navigationContext += `\n<navigation-error>I need to know where you want to go. Please specify a destination.</navigation-error>`;
        }
        return navigationContext;
      }
    }

    const travelModes = determineTravelModes(question);
    console.log("Requested travel modes:", travelModes);

    try {
      // If we have valid locations, get directions for all requested modes
      if ((locations.origin !== "current location" && locations.destination !== "unspecified") ||
          (locations.origin.lat && locations.destination)) {
        const navigationResults = [];

        // Get directions for each requested travel mode
        for (const mode of travelModes) {
          try {
            const directions = await googleMapsApi.getDirections(
              locations.origin,
              locations.destination,
              mode
            );

            navigationResults.push({
              mode: mode,
              directions: directions
            });
          } catch (error) {
            console.error(`Error getting directions for ${mode}:`, error);
            navigationResults.push({
              mode: mode,
              error: error.message
            });
          }
        }

        if (navigationResults.length > 0) {
          navigationContext += `\n<navigation-results>\n${JSON.stringify(navigationResults, null, 2)}\n</navigation-results>`;
        }
      }
    } catch (error) {
      console.error('Error with navigation query:', error);
      navigationContext += `\n<navigation-error>Failed to retrieve directions information: ${error.message}. Please ensure the locations are valid and try again with more specific location names.</navigation-error>`;
    }
  } else {
    // No locations found in the query
    if (authenticatedUser) {
      // Try to use user's last location and suggest nearby places or ask for destination
      try {
        const currentUser = await queryDatabase({
          model: 'Client',
          query: { _id: authenticatedUser },
          select: 'lastLocation',
          limit: 1
        });

        if (currentUser && currentUser.length > 0 && currentUser[0].lastLocation) {
          // We have the user's location but no clear navigation intent
          navigationContext += `\n<navigation-error>I can help you navigate, but I need to know where you want to go. Please specify a destination.</navigation-error>`;
          navigationContext += `\n<location-notice>I'll use your current location as the starting point.</location-notice>`;
        } else {
          navigationContext += `\n<navigation-error>I couldn't determine the specific locations from your question. Please specify an origin and destination more clearly, for example: "How do I get from Piața Unirii to Piața Victoriei?"</navigation-error>`;
        }
      } catch (error) {
        console.error('Error fetching user location for ambiguous query:', error);
        navigationContext += `\n<navigation-error>I couldn't determine the specific locations from your question. Please specify an origin and destination more clearly, for example: "How do I get from Piața Unirii to Piața Victoriei?"</navigation-error>`;
      }
    } else {
      navigationContext += `\n<navigation-error>I couldn't determine the specific locations from your question. Please specify an origin and destination more clearly, for example: "How do I get from Piața Unirii to Piața Victoriei?"</navigation-error>`;
    }
  }

  return navigationContext;
};
