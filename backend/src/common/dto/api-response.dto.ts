import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Success status' })
  success!: boolean;

  @ApiProperty({ description: 'Response message' })
  message!: string;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({ description: 'Error details', required: false })
  error?: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp!: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId!: string;
}

export class PaginatedResponseDto<T = any> extends ApiResponseDto<T[]> {
  @ApiProperty({ description: 'Pagination information' })
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Error status', example: false })
  success!: boolean;

  @ApiProperty({ description: 'Error message' })
  message!: string;

  @ApiProperty({ description: 'Error code' })
  code!: string;

  @ApiProperty({ description: 'Error details', required: false })
  details?: any;

  @ApiProperty({ description: 'Timestamp' })
  timestamp!: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId!: string;
}

export class ValidationErrorDto {
  @ApiProperty({ description: 'Field name' })
  field!: string;

  @ApiProperty({ description: 'Error message' })
  message!: string;

  @ApiProperty({ description: 'Invalid value' })
  value: any;
}
