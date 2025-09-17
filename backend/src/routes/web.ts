import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import path from 'path';

const router: Router = Router();

/**
 * Login page
 */
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

/**
 * Dashboard page (protected)
 */
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

/**
 * User info endpoint
 */
router.get('/api/user', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail
    }
  });
});

/**
 * Health check endpoint
 */
router.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Page Saver API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
