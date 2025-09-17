import { Router, Request, Response } from 'express';
import { generateOAuthState, verifyOAuthState, storeUserSession, clearUserSession } from '../middleware/auth';

const router: Router = Router();

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

/**
 * Initiate LinkedIn OAuth flow
 */
router.get('/linkedin', (req, res) => {
  const state = generateOAuthState();
  req.session.oauthState = state;
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent('http://localhost:3000/auth/linkedin/callback')}&scope=openid%20email%20profile&state=${state}`;
  
  res.redirect(authUrl);
});

/**
 * LinkedIn OAuth callback
 */
router.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Verify state parameter
    if (!verifyOAuthState(req, state as string)) {
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
    storeUserSession(req, userData, tokenData.access_token);
    
    // Store token in database (you can move this to a service later)
    try {
      const { getDatabase } = await import('../config/database');
      const db = getDatabase();
      const tokensCollection = db.collection('linkedin_tokens');
      const usersCollection = db.collection('users');

      await tokensCollection.updateOne({
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

      await usersCollection.updateOne({
        userId: userData.sub
      }, {
        $set: {
          name: userData.name,
          email: userData.email,
          linkedinId: userData.sub,
          profilePicture: userData.picture,
          country: userData.locale.country
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

/**
 * Logout route
 */
router.get('/logout', clearUserSession);

export default router;
