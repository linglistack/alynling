import { authenticateToken } from '../utils/jwt.js';
import User from '../models/User.js';

// Basic authentication middleware
export const authenticateUser = (req, res, next) => {
  authenticateToken(req, res, async (error) => {
    if (error) return;
    
    try {
      // Get user details from database
      const user = await User.findById(req.user.userId).select('-password');
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error during authentication'
      });
    }
  });
};

// Admin authentication middleware
export const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      authenticateUser(req, res, next);
    } catch (error) {
      // Continue without authentication if token is invalid
      next();
    }
  } else {
    next();
  }
};
