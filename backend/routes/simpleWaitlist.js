/**
 * 📝 SIMPLE WAITLIST ROUTES
 * 
 * MICRO-FEATURE: Simple waitlist API endpoints
 * - No authentication required for submissions
 * - Basic admin endpoints for management
 * - Clean, minimal functionality
 * - Easy to integrate and use
 */

import express from 'express';
import SimpleWaitlist from '../models/SimpleWaitlist.js';

const router = express.Router();

/**
 * 📝 PUBLIC ENDPOINTS
 */

// Join waitlist - no authentication required
router.post('/join', async (req, res) => {
  try {
    const {
      email,
      name,
      company = '',
      role = '',
      source = 'website',
      referrer = ''
    } = req.body;

    // Basic validation
    if (!email || !name) {
      return res.status(400).json({
        error: 'Email and name are required',
        required: ['email', 'name']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address'
      });
    }

    // Check if email already exists
    const existingEntry = await SimpleWaitlist.findByEmail(email);
    if (existingEntry) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'This email is already on our waitlist',
        submittedAt: existingEntry.submittedAt
      });
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';

    // Create waitlist entry
    const waitlistEntry = new SimpleWaitlist({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      company: company.trim(),
      role: role.trim(),
      source,
      referrer: referrer.trim(),
      ipAddress,
      userAgent,
      submittedAt: new Date()
    });

    await waitlistEntry.save();

    // Get current stats for response
    const stats = await SimpleWaitlist.getStats();

    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist!',
      entry: {
        email: waitlistEntry.email,
        name: waitlistEntry.name,
        company: waitlistEntry.company,
        submittedAt: waitlistEntry.submittedAt
      },
      stats: {
        position: stats.total, // Simple position based on total count
        totalSignups: stats.total
      }
    });

  } catch (error) {
    console.error('Simple waitlist join error:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        error: 'Email already registered'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});

// Check if email exists (optional endpoint)
router.get('/check/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email parameter is required'
      });
    }

    const entry = await SimpleWaitlist.findByEmail(email);
    
    res.json({
      exists: !!entry,
      entry: entry ? {
        email: entry.email,
        name: entry.name,
        submittedAt: entry.submittedAt
      } : null
    });

  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * 👑 ADMIN ENDPOINTS
 * Note: These have no authentication - they rely on URL obscurity (/alynling)
 * In production, you should add proper authentication
 */

// Get all entries for admin
router.get('/admin/entries', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [entries, total] = await Promise.all([
      SimpleWaitlist.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('email name company role submittedAt')
        .lean(),
      SimpleWaitlist.countDocuments(query)
    ]);

    res.json({
      success: true,
      entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Admin entries error:', error);
    res.status(500).json({
      error: 'Failed to fetch entries'
    });
  }
});

// Get statistics for admin
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await SimpleWaitlist.getStats();
    
    // Get additional insights
    const [companyStats, roleStats, recentEntries] = await Promise.all([
      SimpleWaitlist.aggregate([
        { $match: { company: { $ne: '' } } },
        { $group: { _id: '$company', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      SimpleWaitlist.aggregate([
        { $match: { role: { $ne: '' } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      SimpleWaitlist.getRecentEntries(5)
    ]);

    res.json({
      success: true,
      stats,
      insights: {
        topCompanies: companyStats,
        roleDistribution: roleStats,
        recentEntries
      }
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

// Export entries as CSV
router.get('/admin/export', async (req, res) => {
  try {
    const csvData = await SimpleWaitlist.exportToCsv();
    
    const filename = `waitlist-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Failed to export data'
    });
  }
});

// Delete entry (admin only)
router.delete('/admin/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const entry = await SimpleWaitlist.findByIdAndDelete(id);
    
    if (!entry) {
      return res.status(404).json({
        error: 'Entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Entry deleted successfully',
      deletedEntry: {
        email: entry.email,
        name: entry.name
      }
    });

  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({
      error: 'Failed to delete entry'
    });
  }
});

// Bulk delete entries (admin only)
router.post('/admin/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Invalid or empty ids array'
      });
    }

    const result = await SimpleWaitlist.deleteMany({
      _id: { $in: ids }
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} entries`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      error: 'Failed to delete entries'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const stats = await SimpleWaitlist.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;





