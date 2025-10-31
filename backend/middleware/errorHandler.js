/**
 * ====================================
 * Error Handler Middleware
 * ====================================
 * Purpose: Centralized error handling for the Express application
 * Catches and formats all errors from routes and middleware
 * ====================================
 */

/**
 * Global error handler middleware
 * Must be the last middleware added to the app
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  // Log error details (in development mode, show full stack)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  console.error('\n❌ Error occurred:');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Message:', err.message);
  
  if (isDevelopment) {
    console.error('Stack:', err.stack);
  }

  // Determine status code
  // err.statusCode or err.status (from libraries) or default to 500
  const statusCode = err.statusCode || err.status || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development mode
  if (isDevelopment) {
    errorResponse.stack = err.stack;
  }

  // Include additional error details if available
  if (err.details) {
    errorResponse.details = err.details;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation error';
    errorResponse.details = err.message;
    return res.status(400).json(errorResponse);
  }

  if (err.name === 'UnauthorizedError') {
    errorResponse.error = 'Unauthorized access';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.error = 'Invalid authentication token';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.error = 'Authentication token expired';
    return res.status(401).json(errorResponse);
  }

  if (err.code === 'EBADCSRFTOKEN') {
    errorResponse.error = 'Invalid CSRF token';
    return res.status(403).json(errorResponse);
  }

  // Handle database errors
  if (err.code) {
    // PostgreSQL error codes
    switch (err.code) {
      case '23505': // unique_violation
        errorResponse.error = 'Duplicate entry. This record already exists.';
        return res.status(409).json(errorResponse);
      
      case '23503': // foreign_key_violation
        errorResponse.error = 'Referenced record does not exist.';
        return res.status(400).json(errorResponse);
      
      case '23502': // not_null_violation
        errorResponse.error = 'Required field is missing.';
        return res.status(400).json(errorResponse);
      
      case '22P02': // invalid_text_representation
        errorResponse.error = 'Invalid data format.';
        return res.status(400).json(errorResponse);
      
      case '42P01': // undefined_table
        errorResponse.error = 'Database table not found. Please run migrations.';
        return res.status(500).json(errorResponse);
      
      default:
        if (isDevelopment) {
          errorResponse.error = `Database error: ${err.message}`;
          errorResponse.code = err.code;
        } else {
          errorResponse.error = 'Database operation failed';
        }
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 * 
 * Usage:
 * router.get('/route', asyncHandler(async (req, res) => {
 *   // Your async code here
 * }));
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error class for API errors
 * 
 * Usage:
 * throw new ApiError(404, 'Resource not found');
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Not Found Error
 * Creates a 404 error
 * 
 * Usage:
 * throw notFound('User');
 */
function notFound(resource = 'Resource') {
  return new ApiError(404, `${resource} not found`);
}

/**
 * Validation Error
 * Creates a 400 validation error
 * 
 * Usage:
 * throw validationError('Invalid email format');
 */
function validationError(message, details = null) {
  return new ApiError(400, message, details);
}

/**
 * Unauthorized Error
 * Creates a 401 unauthorized error
 * 
 * Usage:
 * throw unauthorized();
 */
function unauthorized(message = 'Unauthorized access') {
  return new ApiError(401, message);
}

/**
 * Forbidden Error
 * Creates a 403 forbidden error
 * 
 * Usage:
 * throw forbidden('Admin access required');
 */
function forbidden(message = 'Access forbidden') {
  return new ApiError(403, message);
}

/**
 * Internal Server Error
 * Creates a 500 server error
 * 
 * Usage:
 * throw internalError('Failed to process request');
 */
function internalError(message = 'Internal server error') {
  return new ApiError(500, message);
}

module.exports = errorHandler;

// Export helper functions and classes
module.exports.asyncHandler = asyncHandler;
module.exports.ApiError = ApiError;
module.exports.notFound = notFound;
module.exports.validationError = validationError;
module.exports.unauthorized = unauthorized;
module.exports.forbidden = forbidden;
module.exports.internalError = internalError;