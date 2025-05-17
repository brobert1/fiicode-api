import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableMap, RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import prompt from './_prompt.js';
import formatDocumentsAsString from 'ai/functions/format-documents-as-string.js';
import formatDocumentsAsStringsWithDates from 'ai/functions/format-documents-as-strings-with-dates.js';
import vectorStore from 'ai/vector-store/_vector-store.js';
import queryDatabase from '../functions/query-database.js';
import storeNewQuestion from '../functions/store-new-question.js';

// Import modular components
import { isNavigationQuestion, processNavigationQuery } from './utils/navigation.js';
import {
  getUserData,
  getBadgeProgressionData,
  getUserRoutesData,
  getModelData,
} from './utils/database-query.js';
import { sanitizeData } from './utils/sanitize.js';
import { buildCompleteContext } from './utils/context-builder.js';

const PRIORITY_NUM_RESULTS = 3;
const NUM_RESULTS = 6;

const chain = async (question, answerSize, authenticatedUser, previousContext = null) => {
  const llm = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 4096
  });
  let databaseContext = '';
  let highestSimilarityScore = 0;

  // Determine if this is a navigation question
  const isNavigation = isNavigationQuestion(question);

  // Process navigation query if applicable
  if (isNavigation) {
    const navigationContext = await processNavigationQuery(
      question,
      authenticatedUser,
      queryDatabase
    );
    databaseContext += navigationContext;
  }

  // Get vector store context with similarity scores
  const withFeedFilter = { tag: 'feed' };

  // Create custom retrievers that will give us back the similarity scores
  const retrieveWithScores = async (query, filter, maxResults) => {
    // Using vectorStore.similaritySearchWithScore directly to get scores
    const results = await vectorStore.similaritySearchWithScore(
      query,
      maxResults,
      filter
    );

    // Track highest similarity score
    if (results.length > 0) {
      // Results come back as [doc, score] pairs
      const scores = results.map(item => item[1]);
      const currentHighest = Math.max(...scores);

      if (currentHighest > highestSimilarityScore) {
        highestSimilarityScore = currentHighest;
      }
    }

    // Return just the documents for compatibility with existing code
    return results.map(item => item[0]);
  };

  // Use our custom retrieval functions
  const priorityDocs = await retrieveWithScores(
    question,
    withFeedFilter,
    PRIORITY_NUM_RESULTS
  );

  const docs = await retrieveWithScores(
    question,
    { tag: { $ne: 'feed' } },
    NUM_RESULTS
  );

  const priorityContextString = formatDocumentsAsStringsWithDates(priorityDocs);
  const documentsContextString = formatDocumentsAsString(docs);

  // Get database context from various sources
  try {
    // Get the keyword string for querying
    const keywords = question.toLowerCase();

    // Get user-specific data if authenticated
    if (authenticatedUser) {
      // Get basic user data
      const userContext = await getUserData(authenticatedUser, queryDatabase, sanitizeData);
      databaseContext += userContext;

      // If we have user data and it includes XP, get badge progression
      if (userContext && userContext.includes('"xp"')) {
        const userXp = JSON.parse(userContext.match(/"xp"\s*:\s*(\d+)/)[1]);

        // If question is about XP, badges, etc.
        if (
          keywords.includes('xp') ||
          keywords.includes('badge') ||
          keywords.includes('level') ||
          keywords.includes('progress') ||
          keywords.includes('achievement')
        ) {
          const badgeContext = await getBadgeProgressionData(
            authenticatedUser,
            queryDatabase,
            sanitizeData,
            userXp
          );
          databaseContext += badgeContext;
        }
      }

      // If question is about routes
      if (keywords.includes('route') || keywords.includes('travel') || keywords.includes('path')) {
        const routesContext = await getUserRoutesData(
          authenticatedUser,
          queryDatabase,
          sanitizeData
        );
        databaseContext += routesContext;
      }
    }

    // Get general model data based on keywords
    const modelContext = await getModelData(keywords, queryDatabase, sanitizeData);
    databaseContext += modelContext;
  } catch (error) {
    console.error('Error querying database or external APIs:', error);
    databaseContext +=
      '\n<database-error>Failed to retrieve database or external API information</database-error>';
  }

  // Build the complete context
  const completeContext = buildCompleteContext(
    isNavigation,
    databaseContext,
    documentsContextString,
    priorityContextString,
    previousContext
  );

  // Build a chain that uses the context
  const ragChainFromDocs = RunnableSequence.from([
    RunnablePassthrough.assign({
      context: () => completeContext,
      answerSize: () => answerSize,
    }),
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  // Build the overall chain
  let ragChainWithSource = new RunnableMap({
    steps: {
      question: new RunnablePassthrough(),
      answerSize: new RunnablePassthrough(),
    },
  });
  ragChainWithSource = ragChainWithSource.assign({
    answer: ragChainFromDocs,
    // Add a hidden property that will be used to store new questions
    _storeNewQuestion: async (output) => {
      // After generating the answer, store the Q&A pair if confidence was low
      if (!isNavigation) { // Don't store navigation questions as they're dynamic
        await storeNewQuestion(question, output.answer, highestSimilarityScore);
      }
      return true; // Just a placeholder value
    }
  });

  return ragChainWithSource;
};

export default chain;
