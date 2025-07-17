import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

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

// API endpoints
app.post('/api/content', async (req, res) => {
  try {
    const content = req.body;
    const db = client.db('content_saver');
    const collection = db.collection('saved_content');
    
    await collection.insertOne({
      ...content,
      createdAt: new Date()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving content:', error);
    res.status(500).json({ success: false, error: 'Failed to save content' });
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
    //Pull user id from linkedin
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
      const db = client.db('content_saver');
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

// Handle shutdown
process.on('SIGINT', async () => {
  await client.close();
  process.exit();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 