const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log to console for the developer
    console.error(err.stack);

    // Mongoose Bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = { statusCode: 404, message };
    }

    // Mongoose Duplicate Key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { statusCode: 400, message };
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = { statusCode: 400, message };
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler;
