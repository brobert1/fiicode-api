import googleMapsApi from '../../functions/google-maps-api.js';

/**
 * Collection of functions for handling place-related queries
 */

/**
 * Determines if a question is about place details like opening hours
 */
export const isPlaceQuery = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Check for opening hours/schedule patterns
  if (
    lowerQuestion.includes('opening hour') ||
    lowerQuestion.includes('closing hour') ||
    lowerQuestion.includes('opening time') ||
    lowerQuestion.includes('closing time') ||
    lowerQuestion.includes(' open ') ||
    lowerQuestion.includes(' closed ') ||
    lowerQuestion.includes('business hour') ||
    lowerQuestion.includes('working hour') ||
    lowerQuestion.includes('schedule') ||
    lowerQuestion.includes('when does') ||
    lowerQuestion.includes('what time') ||
    lowerQuestion.includes('operating hour') ||
    lowerQuestion.includes('until what time')
  ) {
    // Also check that it contains a place indicator
    return (
      lowerQuestion.includes('museum') ||
      lowerQuestion.includes('restaurant') ||
      lowerQuestion.includes('cafe') ||
      lowerQuestion.includes('shop') ||
      lowerQuestion.includes('store') ||
      lowerQuestion.includes('mall') ||
      lowerQuestion.includes('park') ||
      lowerQuestion.includes('attraction') ||
      lowerQuestion.includes('place') ||
      lowerQuestion.includes('gallery') ||
      lowerQuestion.includes('library') ||
      lowerQuestion.includes('theater') ||
      lowerQuestion.includes('cinema') ||
      lowerQuestion.includes('supermarket') ||
      lowerQuestion.includes('market') ||
      lowerQuestion.includes('building')
    );
  }

  return false;
};

/**
 * Extract place name from a query about opening hours
 */
export const extractPlaceFromQuery = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Patterns to extract place names
  const patterns = [
    // "When does [place] open?"
    /when\s+does\s+(.+?)\s+(?:open|close)/i,

    // "What time does [place] open?"
    /what\s+time\s+does\s+(.+?)\s+(?:open|close)/i,

    // "Is [place] open today?"
    /is\s+(.+?)\s+open/i,

    // "Opening hours of [place]"
    /(?:opening|closing|business|working|operating)\s+hours\s+(?:of|for)\s+(.+?)(?:\?|$|\.)/i,

    // "What are the hours for [place]?"
    /what\s+are\s+the\s+hours\s+(?:of|for)\s+(.+?)(?:\?|$|\.)/i,

    // "[place] schedule"
    /(.+?)\s+(?:schedule|hours|times)/i
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches but it's definitely a place query,
  // try to extract the place by removing the question words
  if (isPlaceQuery(question)) {
    // Remove common question words to isolate the place
    let cleaned = lowerQuestion
      .replace(/when does|what time does|is|are|opening hours|closing hours|business hours|working hours|operating hours|schedule|open|close|today|now|tomorrow/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Often the place is the remaining noun phrase
    if (cleaned.length > 3) {
      return cleaned;
    }
  }

  return null;
};

/**
 * Process a place query to get opening hours and other details
 */
export const processPlaceQuery = async (question, authenticatedUser, queryDatabase) => {
  let placeContext = '';

  // Extract place name from the query
  const placeName = extractPlaceFromQuery(question);

  if (!placeName) {
    placeContext += `\n<place-error>I couldn't determine which place you're asking about. Please specify the name of the place more clearly.</place-error>`;
    return placeContext;
  }

  try {
    // Try to get current user location for better place searching
    let userLocation = null;

    if (authenticatedUser) {
      try {
        const currentUser = await queryDatabase({
          model: 'Client',
          query: { _id: authenticatedUser },
          select: 'lastLocation',
          limit: 1
        });

        if (currentUser && currentUser.length > 0 && currentUser[0].lastLocation) {
          userLocation = currentUser[0].lastLocation;
        }
      } catch (error) {
        console.error('Error fetching user location:', error);
      }
    }

    // Set up search options
    const searchOptions = {};

    // If we have user's location, use it to improve search relevance
    if (userLocation && userLocation.lat && userLocation.lng) {
      searchOptions.location = userLocation;
      searchOptions.radius = 25000; // 25km radius
      placeContext += `\n<location-notice>Using your last known location to find nearby places</location-notice>`;
    }

    // Search for places matching the query
    let searchResults;
    try {
      // First try searching for places near the user
      if (searchOptions.location) {
        searchResults = await googleMapsApi.searchPlaces(placeName, searchOptions);
      }

      // If no results or no location, try a generic search
      if (!searchResults || searchResults.length === 0) {
        searchResults = await googleMapsApi.searchPlaces(placeName);
      }

      if (!searchResults || searchResults.length === 0) {
        placeContext += `\n<place-error>I couldn't find any place matching "${placeName}". Please check the spelling or try a different place.</place-error>`;
        return placeContext;
      }
    } catch (error) {
      console.error('Error searching for places:', error);
      placeContext += `\n<place-error>Error searching for places: ${error.message}</place-error>`;
      return placeContext;
    }

    // Get details for the most relevant place (first result)
    try {
      const placeDetails = await googleMapsApi.getPlaceDetails(searchResults[0].placeId);

      if (!placeDetails) {
        placeContext += `\n<place-error>I found "${placeName}" but couldn't get its details.</place-error>`;
        return placeContext;
      }

      placeContext += `\n<place-details>\n${JSON.stringify(placeDetails, null, 2)}\n</place-details>`;

      // If there are other similar places, mention them
      if (searchResults.length > 1) {
        const otherPlaces = searchResults.slice(1, 4).map(place => ({
          name: place.name,
          address: place.address,
          openNow: place.openNow
        }));

        placeContext += `\n<other-places>\n${JSON.stringify(otherPlaces, null, 2)}\n</other-places>`;
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      placeContext += `\n<place-error>Error getting details for ${placeName}: ${error.message}</place-error>`;
    }
  } catch (error) {
    console.error('Error processing place query:', error);
    placeContext += `\n<place-error>Failed to process your question about ${placeName}. ${error.message}</place-error>`;
  }

  return placeContext;
};
