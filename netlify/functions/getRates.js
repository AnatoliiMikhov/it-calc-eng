// netlify/functions/getRates.js
const { db } = require('../functions/utils/firebase');

/**
 * Netlify serverless function to retrieve rate data from Firestore.
 *
 * @param {object} event - The event object from Netlify, containing HTTP method, headers, etc.
 * @param {object} context - The context object from Netlify, containing user information, etc.
 * @returns {object} - An object containing the statusCode and a JSON stringified body.
 */
exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        message: 'Method Not Allowed',
        error: 'Only GET requests are supported.',
      }),
      headers: { Allow: 'GET' },
    };
  }

  try {
    // Reference to the 'rates' document within the 'config' collection
    const ratesRef = db.collection('config').doc('rates');
    const doc = await ratesRef.get();

    // Check if the document exists
    if (!doc.exists) {
      console.error('Error: config/rates document not found.');
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'Not Found',
          error: 'The requested rates configuration was not found.',
        }),
      };
    }

    // Return the document data
    console.log('Successfully retrieved rates data.');
    return {
      statusCode: 200,
      body: JSON.stringify(doc.data()),
    };
  } catch (error) {
    // Handle any errors during the Firestore operation
    console.error('Error retrieving rates:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
    };
  }
};
