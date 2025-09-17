import { getDatabase } from '../config/database';
import { config } from '../config';

/**
 * LinkedIn OAuth service
 */
export class LinkedInService {
  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string, redirectUri: string, clientId: string): Promise<any> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: config.linkedin.clientSecret!,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LinkedIn token exchange failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get user information from LinkedIn
   */
  static async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from LinkedIn');
    }

    return await response.json();
  }

  /**
   * Store LinkedIn token in database
   */
  static async storeToken(userId: string, accessToken: string, expiresIn: number): Promise<void> {
    try {
      const db = getDatabase();
      const collection = db.collection('linkedin_tokens');
      
      await collection.updateOne({
        userId
      }, {
        $set: {
          accessToken,
          expiresIn,
          createdAt: new Date()
        }
      }, {
        upsert: true
      });
    } catch (error) {
      console.error('Failed to store token in database:', error);
      throw error;
    }
  }
}
