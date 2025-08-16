/**
 * Global Error Handler Middleware
 * Centralized error handling for all routes
 */

const { logger } = require('../utils/logger');

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Cast Error (Invalid MongoDB ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Duplicate Field Error
 */
const handleDuplicateFieldsError = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * Handle Validation Error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Error
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

/**
 * Send error response for development
 */
const sendErrorDev = (err, req, res) => {
  // Log error details in development
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params
  });

  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    requestId: req.id
  });
};

/**
 * Send error response for production
 */
const sendErrorProd = (err, req, res) => {
  // Log error details
  logger.error('Error occurred:', {
    error: err.message,
    requestId: req.id,
    method: req.method,
    url: req.url,
    statusCode: err.statusCode,
    userId: req.user?.id
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      requestId: req.id
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error('Programming error:', err);

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    requestId: req.id
  });
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.code === 11000) error = handleDuplicateFieldsError(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

/**
 * Catch async errors wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle unhandled routes (404)
 */
const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound
};

// Export as default for backward compatibility
module.exports.default = globalErrorHandler;