import mongoose from 'mongoose';

export const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alyn-experiments';
    
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 MongoDB URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000, // 10 second connection timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('🏠 Database:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide specific troubleshooting advice
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check your current IP: curl ifconfig.me');
      console.log('2. Add your IP to Atlas Network Access');
      console.log('3. Make sure you selected "Allow access from anywhere" (0.0.0.0/0) for testing');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n🔧 Authentication issue:');
      console.log('1. Check your username and password in the connection string');
      console.log('2. Make sure the database user has proper permissions');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
      console.log('\n🔧 Network issue:');
      console.log('1. Check your internet connection');
      console.log('2. Try connecting from a different network');
      console.log('3. Check if your firewall is blocking the connection');
    }
    
    console.log('\n📖 Full MongoDB Atlas setup guide:');
    console.log('https://www.mongodb.com/docs/atlas/getting-started/');
    
    process.exit(1);
  }
};

export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
};
