import dotenv from 'dotenv';

dotenv.config();

/**
 * Application configuration
 */
export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  
  // LinkedIn OAuth configuration
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    authScope: process.env.LINKEDIN_AUTH_SCOPE || 'r_liteprofile r_emailaddress',
    responseType: process.env.LINKEDIN_RESPONSE_TYPE || 'code',
  },
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI,
    name: 'page_saver'
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
} as const;

/**
 * Validate required environment variables
 */
export function validateConfig(): void {
  const required = [
    'MONGODB_URI',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
