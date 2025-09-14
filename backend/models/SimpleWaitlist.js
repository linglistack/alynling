/**
 * 📝 SIMPLE WAITLIST MODEL
 * 
 * MICRO-FEATURE: Simple waitlist data storage
 * - Basic contact information
 * - No complex scoring or verification
 * - Clean, minimal schema
 * - Easy to query and export
 */

import mongoose from 'mongoose';

const simpleWaitlistSchema = new mongoose.Schema({
  // Contact Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  company: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  
  role: {
    type: String,
    trim: true,
    maxlength: 100,
    enum: ['', 'ceo', 'cto', 'product', 'engineer', 'designer', 'marketing', 'sales', 'other'],
    default: ''
  },
  
  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  ipAddress: {
    type: String,
    default: ''
  },
  
  userAgent: {
    type: String,
    default: ''
  },
  
  // Source tracking (optional)
  source: {
    type: String,
    default: 'website'
  },
  
  referrer: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'simple_waitlist'
});

// Indexes for better performance
simpleWaitlistSchema.index({ submittedAt: -1 });
simpleWaitlistSchema.index({ email: 1 });
simpleWaitlistSchema.index({ company: 1 });

// Instance methods
simpleWaitlistSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Remove sensitive information from JSON output
  delete obj.ipAddress;
  delete obj.userAgent;
  
  return obj;
};

// Static methods
simpleWaitlistSchema.statics.getStats = async function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const [total, todayCount, weekCount, monthCount] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ submittedAt: { $gte: today } }),
    this.countDocuments({ submittedAt: { $gte: thisWeek } }),
    this.countDocuments({ submittedAt: { $gte: thisMonth } })
  ]);
  
  return {
    total,
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount
  };
};

simpleWaitlistSchema.statics.exportToCsv = async function() {
  const entries = await this.find()
    .sort({ submittedAt: -1 })
    .select('email name company role submittedAt')
    .lean();
  
  if (entries.length === 0) {
    return 'email,name,company,role,submitted_at\n';
  }
  
  const headers = 'email,name,company,role,submitted_at\n';
  const rows = entries.map(entry => {
    const submittedAt = new Date(entry.submittedAt).toISOString();
    return `"${entry.email}","${entry.name}","${entry.company || ''}","${entry.role || ''}","${submittedAt}"`;
  }).join('\n');
  
  return headers + rows;
};

simpleWaitlistSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

simpleWaitlistSchema.statics.getRecentEntries = function(limit = 100) {
  return this.find()
    .sort({ submittedAt: -1 })
    .limit(limit)
    .select('email name company role submittedAt');
};

// Pre-save middleware
simpleWaitlistSchema.pre('save', function(next) {
  // Ensure email is lowercase and trimmed
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Trim other string fields
  if (this.name) {
    this.name = this.name.trim();
  }
  
  if (this.company) {
    this.company = this.company.trim();
  }
  
  if (this.role) {
    this.role = this.role.trim();
  }
  
  next();
});

const SimpleWaitlist = mongoose.model('SimpleWaitlist', simpleWaitlistSchema);

export default SimpleWaitlist;





