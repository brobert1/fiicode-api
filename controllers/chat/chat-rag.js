/**
 * Streaming mode is not straightforward for a RAG chain with sources.
 * The context attachment step in the RAG chain breaks the stream.
 * As such, we need to manually indicate the end of the stream by writing to the response using SSE format.
 * On the FrontEnd, we handle this case gracefully, storing context for the message when specific events are received.
 */

import { error } from '@functions';
import chain from '../../ai/chat/_rag-chain.js';
import storeNewQuestion from '../../ai/functions/store-new-question.js';

// Simple in-memory conversation history store (in production, use a database)
const conversationHistory = new Map();

const chatRag = async ({ question, streamMode, onChunk, answerSize, authenticatedUser, conversationId }) => {
  // Get previous context if available
  const previousContext = conversationId && conversationHistory.has(conversationId)
    ? conversationHistory.get(conversationId)
    : null;

  // Create the chain with the previous context
  const ragChain = await chain(question, answerSize, authenticatedUser, previousContext);
  let highestSimilarityScore = 0;

  if (!streamMode) {
    const response = await ragChain.invoke(question);

    // Store this response in the conversation history
    if (conversationId) {
      const historyEntry = {
        question: question,
        answer: response.answer
      };
      conversationHistory.set(conversationId, historyEntry);
    }

    // _storeNewQuestion will be executed during invoke() and store
    // the Q&A pair if confidence is low

    return response;
  }

  const stream = await ragChain.stream(question);
  let fullAnswer = '';

  for await (const chunk of stream) {
    onChunk(chunk);
    if (chunk && chunk.answer) {
      fullAnswer += chunk.answer;
    }
    // Track similarity score if available in chunk
    if (chunk && chunk._similarityScore && chunk._similarityScore > highestSimilarityScore) {
      highestSimilarityScore = chunk._similarityScore;
    }
  }

  // Store the full answer in history for streaming mode too
  if (conversationId && fullAnswer) {
    const historyEntry = {
      question: question,
      answer: fullAnswer
    };
    conversationHistory.set(conversationId, historyEntry);

    // For streaming mode, we need to manually store the question
    // if confidence was low
    await storeNewQuestion(question, fullAnswer, highestSimilarityScore);
  }
};

const handler = async (req, res) => {
  const { me } = req.user;
  const { question, streamMode, isShortAnswer, conversationId } = req.body;

  if (!me) {
    throw error(403, 'Forbidden');
  }

  if (!question) {
    throw error(400, 'Missing question');
  }

  const answerSize = isShortAnswer
    ? 'Present a short answer.'
    : 'Present the full information. Use your comprehensive knowledge when needed.';

  if (!streamMode) {
    const response = await chatRag({
      question,
      answerSize,
      authenticatedUser: me,
      conversationId
    });
    return res.status(200).json({ response });
  }

  // If streaming mode
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await chatRag({
      question,
      streamMode: true,
      answerSize,
      authenticatedUser: me,
      conversationId,
      onChunk: (chunk) => {
        if (chunk && chunk.answer) {
          sendEvent('answer', chunk.answer);
        } else if (chunk && chunk.context) {
          sendEvent('context', chunk.context);
        }
      },
    });

    sendEvent('end', 'END_OF_STREAM');
    res.end();
  } catch (err) {
    sendEvent('error', err.message);
    console.error(err);
    res.end();
  }
};

export default handler;
