import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = getStatusColor(res.statusCode);
    
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.path} - ` +
      `${statusColor}${res.statusCode}\x1b[0m - ${duration}ms`
    );
  });
  
  next();
}

/**
 * Get color code for HTTP status
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '\x1b[32m'; // Green
  if (statusCode >= 300 && statusCode < 400) return '\x1b[33m'; // Yellow
  if (statusCode >= 400 && statusCode < 500) return '\x1b[31m'; // Red
  if (statusCode >= 500) return '\x1b[35m'; // Magenta
  return '\x1b[0m'; // Reset
}
