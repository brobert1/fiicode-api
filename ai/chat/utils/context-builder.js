/**
 * Functions for building and formatting context for the LLM
 */

/**
 * Build navigation-focused context
 */
export const buildNavigationContext = (databaseContext) => {
  return `
  This is a navigation-related question in Romania.
  ${
    databaseContext
      ? `Here is information from Google Maps API for Romanian routes:${databaseContext}`
      : ''
  }

  When providing navigation information:
  1. Include the key steps and details for routes in Romania
  2. Compare different transportation modes, highlighting their advantages and disadvantages
  3. Mention Romania-specific transportation considerations
  4. Provide useful tips that would help someone navigate effectively

  You may also leverage your general knowledge about Romanian geography, transportation systems, and travel tips beyond the specific information provided.
  `;
};

/**
 * Build general knowledge context
 */
export const buildGeneralContext = (
  documentsContextString,
  priorityContextString,
  databaseContext
) => {
  return `
  These are articles from the Pathly support section:
  <articles>
  ${documentsContextString}
  </articles>

  Recent updates from Pathly administrators:
  <updates>
  ${priorityContextString}
  </updates>

  ${databaseContext ? `Database and API information:${databaseContext}` : ''}

  Provide a balanced response that is neither too brief nor too verbose.
  Use your general knowledge about transportation, navigation systems, and Romania when the provided context is insufficient.
  `;
};

/**
 * Build the complete context for the LLM
 */
export const buildCompleteContext = (
  isNavigation,
  databaseContext,
  documentsContextString,
  priorityContextString,
  previousContext = null
) => {
  const contextBody = isNavigation
    ? buildNavigationContext(databaseContext)
    : buildGeneralContext(documentsContextString, priorityContextString, databaseContext);

  return `${contextBody}

  ${previousContext ? `<previous-context>\n${previousContext}\n</previous-context>` : ''}

  Answer the question thoroughly yet efficiently, focusing on ${
    isNavigation
      ? 'providing accurate navigation information for Romania'
      : 'the information from the knowledge base'
  }.
  Pathly is focused on Romanian transportation systems, so prioritize local context when giving advice.
  If this question relates to previous questions, maintain that context in your response.

  Important: You may use your general knowledge and capabilities to supplement the information provided above when necessary to give the most accurate and helpful response. Do not strictly limit yourself to only the information provided in the context if you know your answer can be improved with your broader knowledge.
  `;
};
