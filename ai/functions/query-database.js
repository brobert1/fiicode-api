import * as Models from '@models';

/**
 * Performs a query against database models and returns structured data
 * @param {Object} options
 * @param {string} options.model - The model to query (e.g., 'Client', 'CustomRoute')
 * @param {Object} options.query - MongoDB query object
 * @param {string[]} options.select - Fields to select
 * @param {number} options.limit - Max number of results
 * @param {string} options.populate - Fields to populate
 * @returns {Promise<Array>} - Query results
 */
const queryDatabase = async ({ model, query = {}, select = '', limit = 10, populate = '' }) => {
  if (!Models[model]) {
    throw new Error(`Model ${model} not found`);
  }

  try {
    let queryBuilder = Models[model].find(query);

    if (select) {
      queryBuilder = queryBuilder.select(select);
    }

    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    if (populate) {
      queryBuilder = queryBuilder.populate(populate);
    }

    const results = await queryBuilder.lean().exec();
    return results;
  } catch (error) {
    console.error(`Error querying ${model}:`, error);
    throw error;
  }
};

export default queryDatabase;
