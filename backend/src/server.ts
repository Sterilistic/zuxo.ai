import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';

// Import configuration
import { config, validateConfig } from './config';
import { connectDB, closeDB } from './config/database';

// Import middleware
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import pagesRoutes from './routes/pages';
import webRoutes from './routes/web';

/**
 * Create Express application
 */
function createApp(): express.Application {
  const app = express();

  // Trust proxy (for production deployment)
  app.set('trust proxy', 1);

  // Middleware
  app.use(cors({
    ...config.cors,
    credentials: true // Allow credentials for session sharing
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Session configuration
  app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.session.secure,
      maxAge: config.session.maxAge
    }
  }));

  // Static files
  app.use('/css', express.static(path.join(__dirname, 'public/css')));
  app.use('/js', express.static(path.join(__dirname, 'public/js')));

  // Routes
  app.use('/auth', authRoutes);
  app.use('/api/pages', pagesRoutes);
  app.use('/', webRoutes);

  // LinkedIn OAuth token exchange endpoint (for extension)
  app.post('/api/linkedin/token', async (req, res) => {
    try {
      const { code, redirectUri, clientId } = req.body;
      
      console.log('LinkedIn token exchange request received');
      console.log('Code:', code ? '[PRESENT]' : '[MISSING]');
      console.log('Redirect URI:', redirectUri);
      console.log('Client ID:', clientId);
      console.log('Client Secret:', config.linkedin.clientSecret ? '[PRESENT]' : '[MISSING]');
      
      if (!code || !redirectUri || !clientId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required parameters: code, redirectUri, clientId'
        });
      }

      if (!config.linkedin.clientSecret) {
        console.error('LinkedIn client secret not configured');
        return res.status(500).json({ 
          success: false, 
          error: 'Server configuration error: LinkedIn client secret not set' 
        });
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: config.linkedin.clientSecret,
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('LinkedIn token exchange failed:', tokenResponse.status, errorText);
        return res.status(tokenResponse.status).json({ 
          success: false, 
          error: `LinkedIn token exchange failed: ${errorText}` 
        });
      }

      const tokenData = await tokenResponse.json();
      console.log('LinkedIn token exchange successful');
      
      // Pull user id from linkedin
      const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      const userData = await userResponse.json();
      const userId = userData.sub;
      
      // Store token in database (optional)
      try {
        const { getDatabase } = await import('./config/database');
        const db = getDatabase();
        const collection = db.collection('linkedin_tokens');
        
        await collection.updateOne({
          userId: userId
        }, {
          $set: {
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
            createdAt: new Date()
          }
        }, {
          upsert: true
        });
      } catch (dbError) {
        console.error('Failed to store token in database:', dbError);
        // Don't fail the request if DB storage fails
      }

      res.status(200).json({
        success: true,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        userId: userId,
        name: userData.localizedFirstName + ' ' + userData.localizedLastName
      });
      
    } catch (error) {
      console.error('Error in LinkedIn token exchange:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error during token exchange' 
      });
    }
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    
    // Connect to database
    await connectDB();
    
    // Create Express app
    const app = createApp();
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Page Saver API running on port ${config.port}`);
      console.log(`📊 Dashboard: http://localhost:${config.port}/dashboard`);
      console.log(`🔐 Login: http://localhost:${config.port}/login`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      server.close(async () => {
        await closeDB();
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      server.close(async () => {
        await closeDB();
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();