import { Test, TestingModule } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/test-endpoint',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ArgumentsHost;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException with status code', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const expectedResponse = {
        statusCode: 400,
        message: ['Test error'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle HttpException with custom message', () => {
      const exception = new HttpException('Custom error message', HttpStatus.NOT_FOUND);
      const expectedResponse = {
        statusCode: 404,
        message: ['Custom error message'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle generic Error', () => {
      const exception = new Error('Generic error');
      const expectedResponse = {
        statusCode: 500,
        message: ['Internal server error'],
        error: 'InternalServerError',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle validation errors', () => {
      const exception = new HttpException(
        {
          message: ['Validation failed'],
          error: 'Bad Request',
          statusCode: 400,
        },
        HttpStatus.BAD_REQUEST,
      );

      const expectedResponse = {
        statusCode: 400,
        message: ['Validation failed'],
        error: 'Bad Request',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle unauthorized errors', () => {
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      const expectedResponse = {
        statusCode: 401,
        message: ['Unauthorized'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle forbidden errors', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      const expectedResponse = {
        statusCode: 403,
        message: ['Forbidden'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle method not allowed errors', () => {
      const exception = new HttpException('Method not allowed', HttpStatus.METHOD_NOT_ALLOWED);
      const expectedResponse = {
        statusCode: 405,
        message: ['Method not allowed'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(405);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle conflict errors', () => {
      const exception = new HttpException('Conflict', HttpStatus.CONFLICT);
      const expectedResponse = {
        statusCode: 409,
        message: ['Conflict'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle unprocessable entity errors', () => {
      const exception = new HttpException('Unprocessable Entity', HttpStatus.UNPROCESSABLE_ENTITY);
      const expectedResponse = {
        statusCode: 422,
        message: ['Unprocessable Entity'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle too many requests errors', () => {
      const exception = new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      const expectedResponse = {
        statusCode: 429,
        message: ['Too Many Requests'],
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
      };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
    });
  });

  describe('getStatus', () => {
    it('should return status code from HttpException', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const status = filter['getStatus'](exception);

      expect(status).toBe(400);
    });

    it('should return 500 for generic Error', () => {
      const exception = new Error('Generic error');
      const status = filter['getStatus'](exception);

      expect(status).toBe(500);
    });
  });

  describe('getErrorMessage', () => {
    it('should return message from HttpException', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const message = filter['getErrorMessage'](exception);

      expect(message).toBe('Test error');
    });

    it('should return message from Error', () => {
      const exception = new Error('Generic error');
      const message = filter['getErrorMessage'](exception);

      expect(message).toBe('Internal server error');
    });

    it('should return default message for unknown error', () => {
      const exception = new Error();
      const message = filter['getErrorMessage'](exception);

      expect(message).toBe('Internal server error');
    });
  });
});
