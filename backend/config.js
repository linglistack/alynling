// Independent configuration module - load environment variables
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/alyn-experiments',
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
  sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_here',
  
  // Google OAuth credentials
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret'
  },
  
  // Frontend URL
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Stripe configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  }
};
