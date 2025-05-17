import googleMapsApi from '../../functions/google-maps-api.js';

/**
 * Collection of functions for handling navigation-related queries
 */

/**
 * Determines if a question is navigation-related
 */
export const isNavigationQuestion = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Detect "from X to Y" patterns even without specific navigation keywords
  const fromToPattern = /from\s+([^,\.]+?)(?:\s+to|\s+and)\s+([^?\.,"]+)/i;
  const toFromPattern = /to\s+([^,\.]+?)\s+from\s+([^?\.,"]+)/i;
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
 * Extract origin and destination from various question formats
 */
export const extractLocations = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Common patterns
  const patterns = [
    // "from X to Y" - most common pattern
    /from\s+([^,\.]+?)(?:\s+to|\s+and)\s+([^?\.,"]+)/i,

    // "to Y from X" - reversed pattern
    /to\s+([^,\.]+?)\s+from\s+([^?\.,"]+)/i,

    // "between X and Y" pattern
    /between\s+([^,\.]+?)\s+and\s+([^?\.,"]+)/i,

    // "how to get to Y" (assumes current location as origin)
    /how\s+(?:to|do\s+i|can\s+i|would\s+i)?\s+(?:get|go|travel|drive|walk|bike)\s+to\s+([^?\.,"]+)/i,
  ];

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
        // "How to get to Y" format (uses current location)
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
 * Handle navigation question and get relevant data
 */
export const processNavigationQuery = async (question, authenticatedUser, queryDatabase) => {
  let navigationContext = '';

  const locations = extractLocations(question);

  if (locations) {
    console.log("Extracted locations:", locations);
    const travelModes = determineTravelModes(question);
    console.log("Requested travel modes:", travelModes);

    try {
      // If current location is specified, try to get user's location from database
      if (locations.origin === 'current location' && authenticatedUser) {
        const currentUser = await queryDatabase({
          model: 'Client',
          query: { _id: authenticatedUser },
          select: 'lastLocation',
          limit: 1
        });

        if (currentUser && currentUser.length > 0 && currentUser[0].lastLocation) {
          locations.origin = currentUser[0].lastLocation;
          console.log("Using user's last known location:", locations.origin);
        } else {
          // Default fallback if no location available
          navigationContext += `\n<navigation-error>I don't have your current location. Please specify an origin point.</navigation-error>`;
          // We'll continue with other context gathering
        }
      }

      // If we have valid locations, get directions for all requested modes
      if (locations.origin !== 'current location' || locations.origin.lat) {
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
    navigationContext += `\n<navigation-error>I couldn't determine the specific locations from your question. Please specify an origin and destination more clearly, for example: "How do I get from Piața Unirii to Piața Victoriei?"</navigation-error>`;
  }

  return navigationContext;
};
