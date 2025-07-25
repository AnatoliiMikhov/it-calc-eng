// netlify/functions/utils/firebase.js
const admin = require('firebase-admin');

// For local development, load environment variables from the .env file.
// The `CONTEXT` variable is only set in Netlify's build/runtime environment.
if (!process.env.CONTEXT) {
  require('dotenv').config();
}

// This check prevents re-initializing the app on every function invocation.
if (!admin.apps.length) {
  let serviceAccount;

  // When running on Netlify, the service account is a Base64 encoded string.
  if (process.env.CONTEXT) {
    serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));
  } else {
    // When running locally via `netlify dev`, it's a direct JSON string from the .env file.
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Export the initialized Firestore database instance for use in other functions.
const db = admin.firestore();

module.exports = { db };