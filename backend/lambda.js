/**
 * AWS Lambda Handler for Family Helper API
 *
 * Wraps the Express.js app for Lambda deployment using serverless-http.
 * This allows the same codebase to run locally (Express) and in Lambda.
 */

const serverless = require('serverless-http');
const app = require('./server');

// Wrap Express app with serverless-http
const handler = serverless(app, {
  request: (request, event, context) => {
    // Add Lambda event and context to request for potential use in controllers
    request.lambdaEvent = event;
    request.lambdaContext = context;
  },
});

// Export the Lambda handler
module.exports.handler = async (event, context) => {
  // Keep the Lambda warm by not waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  // Log request for debugging (remove in production if too verbose)
  if (process.env.DEBUG_LAMBDA === 'true') {
    console.log('Lambda Event:', JSON.stringify(event, null, 2));
  }

  try {
    const response = await handler(event, context);
    return response;
  } catch (error) {
    console.error('Lambda Handler Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
