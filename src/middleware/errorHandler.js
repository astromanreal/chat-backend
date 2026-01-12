
const errorHandler = (err, req, res, next) => {
  // Determine the status code. If it's 200, it means an error was thrown in a route that would otherwise have been successful, so we default to a 500 Internal Server Error. Otherwise, we use the status code set in the controller.
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode);

  // Send a JSON response with the error message.
  res.json({
    msg: err.message,
    // Optionally include the stack trace in development for easier debugging.
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export default errorHandler;
