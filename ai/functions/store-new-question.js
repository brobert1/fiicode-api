import { addDocuments } from '@controllers/document/add-documents.js';

/**
 * Stores a new question and its answer in the vector store
 * @param {string} question - The user's question
 * @param {string} answer - The generated answer
 * @param {number} matchScore - The highest similarity score from vector search
 * @returns {Promise<string[]>} - The IDs of the new document
 */
const storeNewQuestion = async (question, answer, matchScore = 0) => {
  // Only store questions with low match confidence (below threshold)
  const CONFIDENCE_THRESHOLD = 0.75;

  if (matchScore < CONFIDENCE_THRESHOLD) {
    try {
      const newDocument = [{
        pageContent: `Q: ${question}\nA: ${answer}`,
        metadata: {
          source: 'auto-generated',
          tag: 'user-question',
          questionDate: new Date().toISOString(),
          confidence: matchScore
        }
      }];

      const ids = await addDocuments(newDocument);
      console.log(`Stored new question in vector store. ID: ${ids[0]}`);
      return ids;
    } catch (error) {
      console.error('Failed to store new question:', error);
      return null;
    }
  }

  return null;
};

export default storeNewQuestion;
