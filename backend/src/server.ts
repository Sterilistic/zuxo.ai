import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';

// Extend Express session interface
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    userEmail?: string;
    accessToken?: string;
    oauthState?: string;
  }
}

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection URI
const uri = process.env.MONGODB_URI;

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// Create MongoDB client
const client = new MongoClient(uri!, {
  serverApi: ServerApiVersion.v1
});

app.use(cors());
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
}

connectDB();

// Authentication middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.redirect('/login');
  }
}

// Serve static files
app.use('/css', express.static(path.join(__dirname, '../src/public/css')));
app.use('/js', express.static(path.join(__dirname, '../src/public/js')));

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/views/login.html'));
});

// Dashboard route (protected)
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../src/views/dashboard.html'));
});

// API endpoints (protected)
app.post('/api/pages', requireAuth, async (req, res) => {
  try {
    const pageData = req.body;
    const db = client.db('page_saver');
    const collection = db.collection('saved_pages');
    
    // Add metadata
    const pageToSave = {
      ...pageData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await collection.insertOne(pageToSave);

    res.status(200).json({ 
      success: true, 
      message: 'Page saved successfully',
      id: pageToSave._id 
    });
  } catch (error) {
    console.error('Error saving page:', error);
    res.status(500).json({ success: false, error: 'Failed to save page' });
  }
});

// Get all saved pages
app.get('/api/pages', requireAuth, async (req, res) => {
  try {
    const db = client.db('page_saver');
    const collection = db.collection('saved_pages');
    
    const pages = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.status(200).json({ 
      success: true, 
      pages 
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pages' });
  }
});

// Delete a saved page
app.delete('/api/pages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = client.db('page_saver');
    const collection = db.collection('saved_pages');
    
    const result = await collection.deleteOne({ _id: id as any });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Page deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ success: false, error: 'Failed to delete page' });
  }
});

// LinkedIn OAuth token exchange endpoint
app.post('/api/linkedin/token', async (req, res) => {
  try {
    const { code, redirectUri, clientId } = req.body;
    
    console.log('LinkedIn token exchange request received');
    console.log('Code:', code ? '[PRESENT]' : '[MISSING]');
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID:', clientId);
    console.log('Client Secret:', LINKEDIN_CLIENT_SECRET ? '[PRESENT]' : '[MISSING]');
    
    if (!code || !redirectUri || !clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: code, redirectUri, clientId'
      });
    }

    if (!LINKEDIN_CLIENT_SECRET) {
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
        client_secret: LINKEDIN_CLIENT_SECRET,
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
    console.log('LinkedIn user data:', userData);
    const userId = userData.sub;
    
    // Store token in database (optional)
    try {
      const db = client.db('page_saver');
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

// Web-based LinkedIn OAuth flow
app.get('/auth/linkedin', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  req.session.oauthState = state;
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent('http://localhost:3000/auth/linkedin/callback')}&scope=r_liteprofile%20r_emailaddress&state=${state}`;
  
  res.redirect(authUrl);
});

// LinkedIn OAuth callback
app.get('/auth/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Verify state parameter
    if (state !== req.session.oauthState) {
      return res.status(400).send('Invalid state parameter');
    }
    
    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: 'http://localhost:3000/auth/linkedin/callback',
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokenData = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userResponse.json();
    
    // Store user session
    req.session.userId = userData.sub;
    req.session.userName = userData.name || (userData.localizedFirstName + ' ' + userData.localizedLastName);
    req.session.userEmail = userData.email;
    req.session.accessToken = tokenData.access_token;
    
    // Store token in database
    try {
      const db = client.db('page_saver');
      const collection = db.collection('linkedin_tokens');
      
      await collection.updateOne({
        userId: userData.sub
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
    }
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/login');
  });
});

// User info endpoint
app.get('/api/user', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Page Saver API is running',
    timestamp: new Date().toISOString()
  });
});

// Handle shutdown
process.on('SIGINT', async () => {
  await client.close();
  process.exit();
});

app.listen(port, () => {
  console.log(`Page Saver API running on port ${port}`);
}); 