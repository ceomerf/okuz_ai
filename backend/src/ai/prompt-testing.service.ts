import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AIOrchestrator } from './ai-orchestrator.service';
import { PromptVersioningService } from './prompt-versioning.service';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: string;
  expectedTokens?: number;
  expectedCost?: number;
  timeout?: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  templateId: string;
  testCases: TestCase[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestResult {
  id: string;
  testCaseId: string;
  templateId: string;
  version: string;
  input: Record<string, any>;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  duration: number;
  tokens: number;
  cost: number;
  error?: string;
  timestamp: Date;
}

export interface TestReport {
  testSuiteId: string;
  templateId: string;
  version: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  results: TestResult[];
  timestamp: Date;
}

@Injectable()
export class PromptTestingService {
  private readonly logger = new Logger(PromptTestingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly aiOrchestrator: AIOrchestrator,
    private readonly promptVersioning: PromptVersioningService,
  ) {}

  /**
   * Test suite oluştur
   */
  async createTestSuite(data: {
    name: string;
    description: string;
    templateId: string;
    testCases: Omit<TestCase, 'id'>[];
  }): Promise<TestSuite> {
    try {
      this.logger.log(`Creating test suite: ${data.name}`);

      const testSuite = await (this.prisma as any).aiTestSuite.create({
        data: {
          name: data.name,
          description: data.description,
          templateId: data.templateId,
          // Prisma: Json beklendiği için ham objeyi geçiyoruz
          testCases: data.testCases as unknown as any,
          isActive: true,
        },
      });

      this.logger.log(`Test suite created: ${testSuite.id}`);
      return testSuite as any;
    } catch (error) {
      this.logger.error(`Failed to create test suite: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Test suite'i al
   */
  async getTestSuite(testSuiteId: string): Promise<TestSuite | null> {
    try {
      const cacheKey = `test_suite:${testSuiteId}`;
      
      // Cache kontrolü
      const cached = await this.cache.get<TestSuite>(cacheKey);
      if (cached) {
        return cached;
      }

      const testSuite = await (this.prisma as any).aiTestSuite.findUnique({
        where: { id: testSuiteId },
      });

      if (testSuite) {
        // Cache'e kaydet
        await this.cache.set(cacheKey, testSuite, 3600); // 1 saat
      }

      return testSuite as any;
    } catch (error) {
      this.logger.error(`Failed to get test suite: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Test suite'leri listele
   */
  async listTestSuites(options: {
    templateId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<TestSuite[]> {
    try {
      const { templateId, isActive, limit = 50, offset = 0 } = options;

      const testSuites = await (this.prisma as any).aiTestSuite.findMany({
        where: {
          ...(templateId && { templateId }),
          ...(isActive !== undefined && { isActive }),
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return testSuites as any;
    } catch (error) {
      this.logger.error(`Failed to list test suites: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Test suite'i çalıştır
   */
  async runTestSuite(
    testSuiteId: string,
    version?: string
  ): Promise<TestReport> {
    try {
      this.logger.log(`Running test suite: ${testSuiteId}`);

      const testSuite = await this.getTestSuite(testSuiteId);
      if (!testSuite) {
        throw new Error('Test suite not found');
      }

      const results: TestResult[] = [];
      let totalDuration = 0;
      let totalTokens = 0;
      let totalCost = 0;

      // Her test case'i çalıştır
      for (const testCase of testSuite.testCases) {
        try {
          const result = await this.runTestCase(
            testSuite.templateId,
            testCase,
            version
          );
          results.push(result);
          totalDuration += result.duration;
          totalTokens += result.tokens;
          totalCost += result.cost;
        } catch (error) {
          this.logger.error(`Test case failed: ${testCase.name}`, {
            error: (error instanceof Error ? error.message : String(error)),
          });

          results.push({
            id: `test_${Date.now()}_${Math.random()}`,
            testCaseId: testCase.id,
            templateId: testSuite.templateId,
            version: version || 'latest',
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            passed: false,
            duration: 0,
            tokens: 0,
            cost: 0,
            error: (error instanceof Error ? error.message : String(error)),
            timestamp: new Date(),
          });
        }
      }

      const passedTests = results.filter(r => r.passed).length;
      const failedTests = results.length - passedTests;
      const successRate = (passedTests / results.length) * 100;

      const report: TestReport = {
        testSuiteId,
        templateId: testSuite.templateId,
        version: version || 'latest',
        totalTests: results.length,
        passedTests,
        failedTests,
        successRate,
        totalDuration,
        totalTokens,
        totalCost,
        results,
        timestamp: new Date(),
      };

      // Test report'u kaydet
      await this.saveTestReport(report);

      this.logger.log(`Test suite completed: ${testSuiteId}`, {
        totalTests: results.length,
        passedTests,
        failedTests,
        successRate: `${successRate.toFixed(2)}%`,
      });

      return report;
    } catch (error) {
      this.logger.error(`Failed to run test suite: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Test case'i çalıştır
   */
  private async runTestCase(
    templateId: string,
    testCase: TestCase,
    version?: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Template'i render et
      const rendered = await this.promptVersioning.renderTemplate(
        templateId,
        testCase.input,
        version
      );

      // AI çağrısı yap
      const response = await this.aiOrchestrator.generateContent({
        prompt: rendered.content,
        model: rendered.model,
        temperature: rendered.temperature,
        maxTokens: rendered.maxTokens,
        promptType: 'test',
      }, {
        cache: false,
        rateLimit: false,
        fallback: false,
      });

      const duration = Date.now() - startTime;
      const actualOutput = response.content;
      
      // Test assertion
      const passed = this.assertOutput(actualOutput, testCase.expectedOutput);

      return {
        id: `test_${Date.now()}_${Math.random()}`,
        testCaseId: testCase.id,
        templateId,
        version: version || 'latest',
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        duration,
        tokens: response.usage.totalTokens,
        cost: response.cost,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        id: `test_${Date.now()}_${Math.random()}`,
        testCaseId: testCase.id,
        templateId,
        version: version || 'latest',
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        passed: false,
        duration,
        tokens: 0,
        cost: 0,
        error: (error instanceof Error ? error.message : String(error)),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Output assertion
   */
  private assertOutput(actual: string, expected: string): boolean {
    // Basit string comparison
    if (actual === expected) {
      return true;
    }

    // Case-insensitive comparison
    if (actual.toLowerCase() === expected.toLowerCase()) {
      return true;
    }

    // Contains check
    if (expected.includes('contains:') && actual.includes(expected.replace('contains:', ''))) {
      return true;
    }

    // Regex check
    if (expected.startsWith('regex:')) {
      const regex = new RegExp(expected.replace('regex:', ''));
      return regex.test(actual);
    }

    // JSON structure check
    if (expected.startsWith('json:')) {
      try {
        const expectedJson = JSON.parse(expected.replace('json:', ''));
        const actualJson = JSON.parse(actual);
        return this.deepEqual(actualJson, expectedJson);
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Deep equality check
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      
      if (keys1.length !== keys2.length) return false;
      
      for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!this.deepEqual(obj1[key], obj2[key])) return false;
      }
    }
    
    return true;
  }

  /**
   * Test report'u kaydet
   */
  private async saveTestReport(report: TestReport): Promise<void> {
    try {
      await (this.prisma as any).aiTestReport.create({
        data: {
          testSuiteId: report.testSuiteId,
          templateId: report.templateId,
          version: report.version,
          totalTests: report.totalTests,
          passedTests: report.passedTests,
          failedTests: report.failedTests,
          successRate: report.successRate,
          totalDuration: report.totalDuration,
          totalTokens: report.totalTokens,
          totalCost: report.totalCost,
          // Prisma: Json alanı bekliyor
          results: report.results as unknown as any,
          timestamp: report.timestamp,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save test report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test report'ları al
   */
  async getTestReports(options: {
    testSuiteId?: string;
    templateId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<TestReport[]> {
    try {
      const { testSuiteId, templateId, limit = 50, offset = 0 } = options;

      const reports = await (this.prisma as any).aiTestReport.findMany({
        where: {
          ...(testSuiteId && { testSuiteId }),
          ...(templateId && { templateId }),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return reports as any;
    } catch (error) {
      this.logger.error(`Failed to get test reports: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Test suite'i deaktive et
   */
  async deactivateTestSuite(testSuiteId: string): Promise<void> {
    try {
      await (this.prisma as any).aiTestSuite.update({
        where: { id: testSuiteId },
        data: { isActive: false },
      });

      // Cache'i temizle
      await this.cache.del(`test_suite:${testSuiteId}`);

      this.logger.log(`Test suite deactivated: ${testSuiteId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate test suite: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Test suite'i sil
   */
  async deleteTestSuite(testSuiteId: string): Promise<void> {
    try {
      await (this.prisma as any).aiTestSuite.delete({
        where: { id: testSuiteId },
      });

      // Cache'i temizle
      await this.cache.del(`test_suite:${testSuiteId}`);

      this.logger.log(`Test suite deleted: ${testSuiteId}`);
    } catch (error) {
      this.logger.error(`Failed to delete test suite: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Test istatistikleri
   */
  async getTestStatistics(templateId: string): Promise<{
    totalTestSuites: number;
    activeTestSuites: number;
    totalTests: number;
    averageSuccessRate: number;
    lastTestRun: Date;
  }> {
    try {
      const testSuites = await (this.prisma as any).aiTestSuite.findMany({
        where: { templateId },
      });

      const reports = await (this.prisma as any).aiTestReport.findMany({
        where: { templateId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const totalTestSuites = testSuites.length;
      const activeTestSuites = testSuites.filter((ts: any) => ts.isActive).length;
      const totalTests = testSuites.reduce((sum: number, ts: any) => sum + ((ts.testCases as any[] | null)?.length || 0), 0);
      const averageSuccessRate = reports.length > 0 
        ? reports.reduce((sum: number, r: any) => sum + r.successRate, 0) / reports.length 
        : 0;
      const lastTestRun = reports.length > 0 ? reports[0].timestamp : new Date(0);

      return {
        totalTestSuites,
        activeTestSuites,
        totalTests,
        averageSuccessRate,
        lastTestRun,
      };
    } catch (error) {
      this.logger.error(`Failed to get test statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
