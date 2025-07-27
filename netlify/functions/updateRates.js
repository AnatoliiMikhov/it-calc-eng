// netlify/functions/updateRates.js
const { db } = require('../functions/utils/firebase'); // Import the initialized Firestore instance

/**
 * Netlify serverless function to update rates in Firestore.
 * This function allows authenticated 'admin' users to update the single document
 * containing all rate configurations at the 'config/rates' path in the Firestore database.
 *
 * @param {Object} event - The event object from Netlify, containing request details (e.g., body).
 * @param {Object} context - The context object from Netlify, containing information about the invocation, function, and deployment, including client context for authentication.
 * @returns {Object} An object containing the HTTP status code and the JSON body with a success message or an error message.
 */
exports.handler = async (event, context) => {
  // Ensure the request method is POST. This function is designed to only update data.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        message: 'Method Not Allowed',
        error: 'Only POST requests are supported for this endpoint.',
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Authentication Check: Ensure user is logged in and has the 'admin' role.
  const user = context.clientContext.user;

  if (!user) {
    console.warn('Unauthorized attempt to update rates: No user found in context.');
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized',
        error: 'You must be logged in to update rates.',
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // Netlify Identity adds roles to the app_metadata.
  const roles = user.app_metadata.roles || [];
  if (!roles.includes('admin')) {
    console.warn(`Forbidden attempt to update rates: User ${user.email} does not have admin role.`);
    return {
      statusCode: 403,
      body: JSON.stringify({
        message: 'Forbidden',
        error: 'You do not have permission to update rates. Admin access required.',
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    // Parse the request body to get the new rates data.
    const newRates = JSON.parse(event.body);
    console.log('Received new rates for update:', newRates);

    // Reference to the 'rates' document within the 'config' collection.
    const ratesRef = db.collection('config').doc('rates');

    // Update the document with the new data.
    // Using set with { merge: true } ensures that only the provided fields are updated,
    // and existing fields not in newRates are preserved.
    // For this specific case, we assume the incoming newRates object will contain
    // the complete structure of the rates document. If not, merge: true would be safer.
    // For now, we'll assume a full overwrite for simplicity as per common admin panel behavior.
    await ratesRef.set(newRates); // Overwrites the document with newRates

    console.log('Successfully updated rates.');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Rates updated successfully!' }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    // Log the error for debugging purposes.
    console.error('Error updating rates:', error);
    // Return a 500 status code for server errors.
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to update rates',
        error: error.message,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
