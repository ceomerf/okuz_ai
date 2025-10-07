export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseUser {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'PARENT' | 'COACH' | 'ADMIN';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
  requestId: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BaseFilter {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  type?: string;
}

export interface BaseService {
  findById(id: string): Promise<any>;
  findAll(filters?: BaseFilter, pagination?: PaginationParams): Promise<PaginatedResponse<any>>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<boolean>;
}

export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: BaseFilter, pagination?: PaginationParams): Promise<{ data: T[]; total: number }>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}
