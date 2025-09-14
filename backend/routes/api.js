import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Protected dashboard data endpoint
router.get('/dashboard', authenticateUser, async (req, res) => {
  try {
    // This would typically fetch user-specific dashboard data
    // For now, return sample data that matches your app's needs
    const dashboardData = {
      user: req.user.getPublicProfile(),
      stats: {
        totalExperiments: 0,
        activeExperiments: 0,
        completedExperiments: 0,
        totalModels: 0
      },
      recentActivity: [],
      notifications: []
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// User preferences endpoint
router.get('/preferences', authenticateUser, async (req, res) => {
  try {
    res.json({
      success: true,
      preferences: req.user.preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching preferences'
    });
  }
});

// Update user preferences
router.put('/preferences', authenticateUser, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid preferences object required'
      });
    }

    req.user.preferences = { ...req.user.preferences, ...preferences };
    await req.user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: req.user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating preferences'
    });
  }
});

export default router;
