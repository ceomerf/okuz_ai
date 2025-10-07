import { Controller, Post, Get, Body, Query, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIOrchestrator } from './ai-orchestrator.service';
import { PromptVersioningService } from './prompt-versioning.service';
import { AIRateLimitService } from './ai-rate-limit.service';
import { PromptTestingService } from './prompt-testing.service';
import { AIMonitoringService } from './ai-monitoring.service';

export class AIRequestDto {
  prompt!: string;
  context?: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptType?: string;
  version?: string;
}

export class PromptTemplateDto {
  name!: string;
  content!: string;
  variables!: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class TestSuiteDto {
  name!: string;
  description!: string;
  templateId!: string;
  testCases!: Array<{
    name: string;
    description: string;
    input: Record<string, any>;
    expectedOutput: string;
    expectedTokens?: number;
    expectedCost?: number;
    timeout?: number;
  }>;
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AIController {
  constructor(
    private readonly aiOrchestrator: AIOrchestrator,
    private readonly promptVersioning: PromptVersioningService,
    private readonly rateLimit: AIRateLimitService,
    private readonly promptTesting: PromptTestingService,
    private readonly monitoring: AIMonitoringService,
  ) {}

  /**
   * AI content generation
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generate AI content',
    description: 'Generate content using AI with rate limiting and fallback strategies'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Content generated successfully',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        model: { type: 'string' },
        usage: {
          type: 'object',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        },
        duration: { type: 'number' },
        requestId: { type: 'string' },
        timestamp: { type: 'string' },
        cost: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'AI service error' })
  async generateContent(
    @Body() request: AIRequestDto,
    @Query('cache') cache?: boolean,
    @Query('cacheTTL') cacheTTL?: number,
    @Query('rateLimit') rateLimit?: boolean,
    @Query('fallback') fallback?: boolean,
  ) {
    return await this.aiOrchestrator.generateContent(request, {
      cache,
      cacheTTL,
      rateLimit,
      fallback,
    });
  }

  /**
   * Generate content with prompt template
   */
  @Post('generate-with-prompt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generate content with prompt template',
    description: 'Generate content using a predefined prompt template'
  })
  @ApiResponse({ status: 200, description: 'Content generated successfully' })
  async generateWithPrompt(
    @Body() request: {
      promptType: string;
      context: Record<string, any>;
      version?: string;
    },
    @Query('cache') cache?: boolean,
    @Query('cacheTTL') cacheTTL?: number,
  ) {
    return await this.aiOrchestrator.generateWithPrompt(
      request.promptType,
      request.context,
      {
        cache,
        cacheTTL,
        rateLimit: true,
        fallback: true,
      }
    );
  }

  /**
   * Create prompt template
   */
  @Post('templates')
  @ApiOperation({ 
    summary: 'Create prompt template',
    description: 'Create a new prompt template with versioning support'
  })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() template: PromptTemplateDto) {
    return await this.promptVersioning.createTemplate(template);
  }

  /**
   * Get prompt template
   */
  @Get('templates/:id')
  @ApiOperation({ 
    summary: 'Get prompt template',
    description: 'Get a prompt template by ID and optional version'
  })
  @ApiQuery({ name: 'version', required: false, description: 'Template version' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplate(
    @Param('id') id: string,
    @Query('version') version?: string
  ) {
    return await this.promptVersioning.getTemplate(id, version);
  }

  /**
   * List prompt templates
   */
  @Get('templates')
  @ApiOperation({ 
    summary: 'List prompt templates',
    description: 'List all prompt templates with optional filtering'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of templates to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of templates to skip' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async listTemplates(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return await this.promptVersioning.listTemplates({
      limit,
      offset,
      isActive,
    });
  }

  /**
   * Update prompt template
   */
  @Post('templates/:id/update')
  @ApiOperation({ 
    summary: 'Update prompt template',
    description: 'Update a prompt template and create a new version'
  })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() data: {
      content?: string;
      variables?: string[];
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) {
    return await this.promptVersioning.updateTemplate(id, data);
  }

  /**
   * Test prompt template
   */
  @Post('templates/:id/test')
  @ApiOperation({ 
    summary: 'Test prompt template',
    description: 'Test a prompt template with test cases'
  })
  @ApiResponse({ status: 200, description: 'Template tested successfully' })
  async testTemplate(
    @Param('id') id: string,
    @Body() testCases: Array<{
      name: string;
      input: Record<string, any>;
      expectedOutput: string;
    }>,
    @Query('version') version?: string
  ) {
    return await this.promptVersioning.testTemplate(id, testCases, version);
  }

  /**
   * Create test suite
   */
  @Post('test-suites')
  @ApiOperation({ 
    summary: 'Create test suite',
    description: 'Create a new test suite for prompt testing'
  })
  @ApiResponse({ status: 201, description: 'Test suite created successfully' })
  async createTestSuite(@Body() testSuite: TestSuiteDto) {
    return await this.promptTesting.createTestSuite(testSuite);
  }

  /**
   * Run test suite
   */
  @Post('test-suites/:id/run')
  @ApiOperation({ 
    summary: 'Run test suite',
    description: 'Run a test suite and get results'
  })
  @ApiResponse({ status: 200, description: 'Test suite executed successfully' })
  async runTestSuite(
    @Param('id') id: string,
    @Query('version') version?: string
  ) {
    return await this.promptTesting.runTestSuite(id, version);
  }

  /**
   * Get test reports
   */
  @Get('test-reports')
  @ApiOperation({ 
    summary: 'Get test reports',
    description: 'Get test execution reports'
  })
  @ApiQuery({ name: 'testSuiteId', required: false, description: 'Filter by test suite ID' })
  @ApiQuery({ name: 'templateId', required: false, description: 'Filter by template ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of reports to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of reports to skip' })
  @ApiResponse({ status: 200, description: 'Test reports retrieved successfully' })
  async getTestReports(
    @Query('testSuiteId') testSuiteId?: string,
    @Query('templateId') templateId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.promptTesting.getTestReports({
      testSuiteId,
      templateId,
      limit,
      offset,
    });
  }

  /**
   * Get rate limit status
   */
  @Get('rate-limit/status')
  @ApiOperation({ 
    summary: 'Get rate limit status',
    description: 'Get current rate limit status for the user'
  })
  @ApiResponse({ status: 200, description: 'Rate limit status retrieved successfully' })
  async getRateLimitStatus() {
    // Bu endpoint'te userId'yi request'ten alacak
    const userId = 'current-user-id'; // Gerçek implementasyonda JWT'den alınacak
    return await this.rateLimit.getRateLimitStatistics(userId);
  }

  /**
   * Get AI metrics
   */
  @Get('metrics')
  @ApiOperation({ 
    summary: 'Get AI metrics',
    description: 'Get AI usage metrics and performance data'
  })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for metrics (1h, 24h, 7d, 30d)' })
  @ApiResponse({ status: 200, description: 'AI metrics retrieved successfully' })
  async getAIMetrics(@Query('timeRange') timeRange?: string) {
    return await this.monitoring.collectAIMetrics(timeRange);
  }

  /**
   * Get AI dashboard
   */
  @Get('dashboard')
  @ApiOperation({ 
    summary: 'Get AI dashboard',
    description: 'Get comprehensive AI dashboard with metrics, alerts, and recommendations'
  })
  @ApiResponse({ status: 200, description: 'AI dashboard retrieved successfully' })
  async getAIDashboard() {
    return await this.monitoring.getAIDashboard();
  }

  /**
   * Get cost analysis
   */
  @Get('costs/analysis')
  @ApiOperation({ 
    summary: 'Get cost analysis',
    description: 'Get AI usage cost analysis and trends'
  })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for cost analysis' })
  @ApiResponse({ status: 200, description: 'Cost analysis retrieved successfully' })
  async getCostAnalysis(@Query('timeRange') timeRange?: string) {
    return await this.monitoring.analyzeCosts(timeRange);
  }

  /**
   * Get performance analysis
   */
  @Get('performance/analysis')
  @ApiOperation({ 
    summary: 'Get performance analysis',
    description: 'Get AI performance analysis and recommendations'
  })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for performance analysis' })
  @ApiResponse({ status: 200, description: 'Performance analysis retrieved successfully' })
  async getPerformanceAnalysis(@Query('timeRange') timeRange?: string) {
    return await this.monitoring.analyzePerformance(timeRange);
  }

  /**
   * Check AI health
   */
  @Get('health')
  @ApiOperation({ 
    summary: 'Check AI health',
    description: 'Check AI service health and availability'
  })
  @ApiResponse({ status: 200, description: 'AI health status retrieved successfully' })
  async checkHealth() {
    return await this.aiOrchestrator.checkHealth();
  }

  /**
   * Get usage statistics
   */
  @Get('usage/statistics')
  @ApiOperation({ 
    summary: 'Get usage statistics',
    description: 'Get AI usage statistics for the user or organization'
  })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID for statistics' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  async getUsageStatistics(
    @Query('userId') userId?: string,
    @Query('timeRange') timeRange?: string
  ) {
    return await this.aiOrchestrator.getUsageStatistics(userId, timeRange);
  }
}
