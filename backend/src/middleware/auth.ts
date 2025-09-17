import { Request, Response, NextFunction } from 'express';

// Extend Express session interface
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    userEmail?: string;
    profilePicture?: string;
    accessToken?: string;
    oauthState?: string;
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name?: string;
        email?: string;
      };
    }
  }
}

/**
 * Authentication middleware to protect routes
 * Checks if user is authenticated via session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.redirect('/login');
  }
}

/**
 * Optional authentication middleware
 * Sets user info in request if authenticated, but doesn't block access
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
        req.user = {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail
    };
  }
        next();
}

/**
 * Generate a random state string for OAuth CSRF protection
 */
export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2);
}

/**
 * Verify OAuth state parameter for CSRF protection
 */
export function verifyOAuthState(req: Request, providedState: string): boolean {
  return req.session.oauthState === providedState;
}

/**
 * Store user session data after successful authentication
 */
export function storeUserSession(
  req: Request, 
  userData: {
    sub: string;
    name?: string;
    localizedFirstName?: string;
    localizedLastName?: string;
    email?: string;
    profilePicture?: string;
  },
  accessToken: string
): void {
  req.session.userId = userData.sub;
  req.session.userName = userData.name || (userData.localizedFirstName + ' ' + userData.localizedLastName);
  req.session.userEmail = userData.email;
  req.session.profilePicture = userData.profilePicture;
  req.session.accessToken = accessToken;
}

/**
 * Clear user session data on logout
 */
export function clearUserSession(req: Request, res: Response, next: NextFunction): void {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    }
    res.redirect('/login');
  });
}
