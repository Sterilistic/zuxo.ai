// Interface for saved pages
export interface SavedPage {
    _id?: string;
    url: string;
    title: string;
    timestamp: number;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  // Interface for API responses
  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  // Interface for pagination
  export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
  
  // Interface for search/filter
  export interface PageFilters {
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    domain?: string;
  }