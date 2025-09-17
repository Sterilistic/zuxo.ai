import { getDatabase } from '../config/database';
import { SavedPage } from '../types';

/**
 * Page management service
 */
export class PageService {
  /**
   * Save a new page
   */
  static async savePage(pageData: Omit<SavedPage, '_id' | 'createdAt' | 'updatedAt'>): Promise<SavedPage> {
    const db = getDatabase();
    const collection = db.collection('saved_pages');
    
    const pageToSave = {
      ...pageData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(pageToSave);
    
    return {
      ...pageToSave,
      _id: result.insertedId.toString()
    };
  }

  /**
   * Get all saved pages with pagination
   */
  static async getPages(limit: number = 100, skip: number = 0): Promise<SavedPage[]> {
    const db = getDatabase();
    const collection = db.collection('saved_pages');
    
    const pages = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return pages.map(page => ({
      _id: page._id.toString(),
      url: page.url,
      title: page.title,
      timestamp: page.timestamp,
      description: page.description,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt
    }));
  }

  /**
   * Delete a page by ID
   */
  static async deletePage(pageId: string): Promise<boolean> {
    const db = getDatabase();
    const collection = db.collection('saved_pages');
    
    const result = await collection.deleteOne({ _id: pageId as any });
    return result.deletedCount > 0;
  }

  /**
   * Get page statistics
   */
  static async getPageStats(): Promise<{
    totalPages: number;
    weekPages: number;
    uniqueDomains: number;
  }> {
    const db = getDatabase();
    const collection = db.collection('saved_pages');
    
    const totalPages = await collection.countDocuments();
    
    const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    const weekPages = await collection.countDocuments({
      createdAt: { $gte: weekAgo }
    });
    
    const domains = await collection.distinct('url');
    const uniqueDomains = new Set(domains.map(url => new URL(url).hostname)).size;
    
    return {
      totalPages,
      weekPages,
      uniqueDomains
    };
  }
}
