import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { PageService } from '../services/pageService';
import { asyncHandler } from '../middleware/errorHandler';

const router: Router = Router();

/**
 * Save a new page (session-based auth)
 */
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pageData = req.body;
  const savedPage = await PageService.savePage(pageData);

  res.status(200).json({ 
    success: true, 
    message: 'Page saved successfully',
    data: savedPage
  });
}));

/**
 * Save a new page (token-based auth for extension)
 */
router.post('/token', asyncHandler(async (req: Request, res: Response) => {
  console.log('Saving page from extension (token auth)');
  const { pageData } = req.body;
  
  if (!pageData) {
    return res.status(400).json({ 
      success: false, 
      error: 'Page data is required' 
    });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authorization header with Bearer token is required' 
    });
  }

  const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify the token by fetching user info
  try {
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid access token' 
      });
    }

    const userData = await userResponse.json();
    console.log('Token verified for user:', userData.sub);
    
    const savedPage = await PageService.savePage(pageData);

    res.status(200).json({ 
      success: true, 
      message: 'Page saved successfully',
      data: savedPage
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'Token verification failed' 
    });
  }
}));

/**
 * Get all saved pages
 */
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const skip = parseInt(req.query.skip as string) || 0;
  
  const pages = await PageService.getPages(limit, skip);

  res.status(200).json({ 
    success: true, 
    data: pages
  });
}));

/**
 * Get page statistics
 */
router.get('/stats', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const stats = await PageService.getPageStats();

  res.status(200).json({ 
    success: true, 
    data: stats
  });
}));

/**
 * Delete a saved page
 */
router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await PageService.deletePage(id);

  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Page not found' });
  }

  res.status(200).json({ 
    success: true, 
    message: 'Page deleted successfully' 
  });
}));

/**
 * Sync bookmarks from extension (session-based auth)
 */
router.post('/bookmarks', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  console.log('Syncing bookmarks from extension (session auth)');
  const { bookmarks } = req.body;
  console.log('Bookmarks:', bookmarks);

  if (!bookmarks || !Array.isArray(bookmarks)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Bookmarks array is required' 
    });
  }

  const results = await PageService.syncBookmarks(bookmarks);

  res.status(200).json({ 
    success: true, 
    message: `Synced ${results.synced} bookmarks`,
    data: {
      synced: results.synced,
      skipped: results.skipped,
      total: bookmarks.length
    }
  });
}));

/**
 * Sync bookmarks from extension (token-based auth)
 */
router.post('/bookmarks/token', asyncHandler(async (req: Request, res: Response) => {
  console.log('Syncing bookmarks from extension (token auth)');
  const { bookmarks } = req.body;
  
  if (!bookmarks || !Array.isArray(bookmarks)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Bookmarks array is required' 
    });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authorization header with Bearer token is required' 
    });
  }

  const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify the token by fetching user info
  try {
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid access token' 
      });
    }

    const userData = await userResponse.json();
    console.log('Token verified for user:', userData.sub);
    
    const results = await PageService.syncBookmarks(bookmarks);

    res.status(200).json({ 
      success: true, 
      message: `Synced ${results.synced} bookmarks`,
      data: {
        synced: results.synced,
        skipped: results.skipped,
        total: bookmarks.length
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'Token verification failed' 
    });
  }
}));

export default router;
