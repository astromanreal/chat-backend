import jwt from 'jsonwebtoken';

export default function (req, res, next) {
    let token;

    // Check for the standard Authorization header first
    if (req.header('Authorization') && req.header('Authorization').startsWith('Bearer ')) {
        // Extract the token from the "Bearer <token>" string
        token = req.header('Authorization').split(' ')[1];
    } 
    // Fallback to check for the old 'x-auth-token' header if you need to support both
    else if (req.header('x-auth-token')) {
        token = req.header('x-auth-token');
    }

    // If no token is found after checking both headers, deny authorization
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach the user payload to the request object
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
