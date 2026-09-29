const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Protects admin-only routes (viewing, updating status, and deleting appointments).
 */
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authorization token provided.',
      });
    }

    const token = authHeader.split(' ')[1].trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed authorization token.',
      });
    }

    const secret = process.env.JWT_SECRET || 'dental_clinic_super_secret_jwt_key_2026';
    const decoded = jwt.verify(token, secret);

    // Attach decoded admin payload to request
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token. Please log in again.',
    });
  }
};

module.exports = authenticateAdmin;
