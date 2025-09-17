import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { PageService } from '../services/pageService';
import { asyncHandler } from '../middleware/errorHandler';

const router: Router = Router();

/**
 * Save a new page
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

export default router;
