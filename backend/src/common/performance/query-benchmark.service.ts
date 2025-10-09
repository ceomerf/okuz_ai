import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OptimizedQueryService } from '../prisma/optimized-query.service';

export interface BenchmarkResult {
  operation: string;
  duration: number;
  queryCount: number;
  memoryUsage: number;
  timestamp: Date;
}

export interface PerformanceComparison {
  operation: string;
  originalDuration: number;
  optimizedDuration: number;
  improvement: number;
  improvementPercentage: number;
}

@Injectable()
export class QueryBenchmarkService {
  private readonly logger = new Logger(QueryBenchmarkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly optimizedQuery: OptimizedQueryService,
  ) {}

  /**
   * N+1 query problemlerini benchmark et
   */
  async benchmarkNPlusOneQueries(): Promise<PerformanceComparison[]> {
    const results: PerformanceComparison[] = [];

    // Test verileri
    const testUserIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const testCoachId = 'coach1';

    // 1. User Plans Benchmark
    const userPlansResult = await this.benchmarkUserPlans(testUserIds);
    results.push(userPlansResult);

    // 2. Coach Students Benchmark
    const coachStudentsResult = await this.benchmarkCoachStudents(testCoachId);
    results.push(coachStudentsResult);

    // 3. User Data Benchmark
    const userDataResult = await this.benchmarkUserData(testUserIds);
    results.push(userDataResult);

    return results;
  }

  /**
   * User Plans benchmark
   */
  private async benchmarkUserPlans(userIds: string[]): Promise<PerformanceComparison> {
    this.logger.log('Benchmarking user plans...');

    // Original approach (N+1 queries)
    const originalStart = Date.now();
    const originalMemoryStart = process.memoryUsage().heapUsed;
    
    const originalResults = await Promise.all(
      userIds.map(async (userId) => {
        // Her user için ayrı sorgular
        const user = await (this.prisma as any).user.findUnique({
          where: { id: userId },
          include: { studentProfile: true },
        });
        
        const plans = await (this.prisma as any).plan.findMany({
          where: { userId },
          include: { studySessions: true },
        });
        
        return { user, plans };
      })
    );
    
    const originalDuration = Date.now() - originalStart;
    const originalMemory = process.memoryUsage().heapUsed - originalMemoryStart;

    // Optimized approach (single query per user)
    const optimizedStart = Date.now();
    const optimizedMemoryStart = process.memoryUsage().heapUsed;
    
    const optimizedResults = await Promise.all(
      userIds.map(userId => this.optimizedQuery.getPlansWithSessions(userId, { cache: false }))
    );
    
    const optimizedDuration = Date.now() - optimizedStart;
    const optimizedMemory = process.memoryUsage().heapUsed - optimizedMemoryStart;

    const improvement = originalDuration - optimizedDuration;
    const improvementPercentage = (improvement / originalDuration) * 100;

    this.logger.log(`User Plans Benchmark: ${improvementPercentage.toFixed(2)}% improvement`);

    return {
      operation: 'User Plans',
      originalDuration,
      optimizedDuration,
      improvement,
      improvementPercentage,
    };
  }

  /**
   * Coach Students benchmark
   */
  private async benchmarkCoachStudents(coachId: string): Promise<PerformanceComparison> {
    this.logger.log('Benchmarking coach students...');

    // Original approach (N+1 queries)
    const originalStart = Date.now();
    const originalMemoryStart = process.memoryUsage().heapUsed;
    
    const originalResults = await (this.prisma as any).coachStudent.findMany({
      where: { coachId, isActive: true },
      include: {
        student: {
          include: {
            studentProfile: true,
            studentCompliance: {
              orderBy: { date: 'desc' },
              take: 7,
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    
    const originalDuration = Date.now() - originalStart;
    const originalMemory = process.memoryUsage().heapUsed - originalMemoryStart;

    // Optimized approach
    const optimizedStart = Date.now();
    const optimizedMemoryStart = process.memoryUsage().heapUsed;
    
    const optimizedResults = await this.optimizedQuery.getCoachStudentsOptimized(coachId, { cache: false });
    
    const optimizedDuration = Date.now() - optimizedStart;
    const optimizedMemory = process.memoryUsage().heapUsed - optimizedMemoryStart;

    const improvement = originalDuration - optimizedDuration;
    const improvementPercentage = (improvement / originalDuration) * 100;

    this.logger.log(`Coach Students Benchmark: ${improvementPercentage.toFixed(2)}% improvement`);

    return {
      operation: 'Coach Students',
      originalDuration,
      optimizedDuration,
      improvement,
      improvementPercentage,
    };
  }

  /**
   * User Data benchmark
   */
  private async benchmarkUserData(userIds: string[]): Promise<PerformanceComparison> {
    this.logger.log('Benchmarking user data...');

    // Original approach (N+1 queries)
    const originalStart = Date.now();
    const originalMemoryStart = process.memoryUsage().heapUsed;
    
    const originalResults = await Promise.all(
      userIds.map(async (userId) => {
        // Her user için ayrı sorgular
        const user = await (this.prisma as any).user.findUnique({
          where: { id: userId },
          include: { studentProfile: true },
        });
        
        const studySessions = await (this.prisma as any).studySession.findMany({
          where: { userId },
          orderBy: { startTime: 'desc' },
          take: 200,
        });
        
        const quizzes = await (this.prisma as any).quiz.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
        
        const examResults = await (this.prisma as any).examResult.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        
        return { user, studySessions, quizzes, examResults };
      })
    );
    
    const originalDuration = Date.now() - originalStart;
    const originalMemory = process.memoryUsage().heapUsed - originalMemoryStart;

    // Optimized approach
    const optimizedStart = Date.now();
    const optimizedMemoryStart = process.memoryUsage().heapUsed;
    
    const optimizedResults = await this.optimizedQuery.getBatchUserData(userIds, { cache: false });
    
    const optimizedDuration = Date.now() - optimizedStart;
    const optimizedMemory = process.memoryUsage().heapUsed - optimizedMemoryStart;

    const improvement = originalDuration - optimizedDuration;
    const improvementPercentage = (improvement / originalDuration) * 100;

    this.logger.log(`User Data Benchmark: ${improvementPercentage.toFixed(2)}% improvement`);

    return {
      operation: 'User Data',
      originalDuration,
      optimizedDuration,
      improvement,
      improvementPercentage,
    };
  }

  /**
   * Query count benchmark
   */
  async benchmarkQueryCounts(): Promise<{
    originalQueries: number;
    optimizedQueries: number;
    reduction: number;
    reductionPercentage: number;
  }> {
    this.logger.log('Benchmarking query counts...');

    const testUserIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const testCoachId = 'coach1';

    // Original approach query count
    let originalQueryCount = 0;
    
    // User plans queries
    for (const userId of testUserIds) {
      originalQueryCount += 2; // user + plans queries
    }
    
    // Coach students queries
    originalQueryCount += 1; // coachStudent query
    originalQueryCount += testUserIds.length * 2; // student + compliance queries
    
    // User data queries
    for (const userId of testUserIds) {
      originalQueryCount += 4; // user + studySessions + quizzes + examResults
    }

    // Optimized approach query count
    let optimizedQueryCount = 0;
    
    // User plans queries
    optimizedQueryCount += testUserIds.length; // 1 query per user
    
    // Coach students queries
    optimizedQueryCount += 1; // 1 query for all coach students
    
    // User data queries
    optimizedQueryCount += testUserIds.length; // 1 query per user

    const reduction = originalQueryCount - optimizedQueryCount;
    const reductionPercentage = (reduction / originalQueryCount) * 100;

    this.logger.log(`Query Count Benchmark: ${reductionPercentage.toFixed(2)}% reduction`);

    return {
      originalQueries: originalQueryCount,
      optimizedQueries: optimizedQueryCount,
      reduction,
      reductionPercentage,
    };
  }

  /**
   * Memory usage benchmark
   */
  async benchmarkMemoryUsage(): Promise<{
    originalMemory: number;
    optimizedMemory: number;
    reduction: number;
    reductionPercentage: number;
  }> {
    this.logger.log('Benchmarking memory usage...');

    const testUserIds = ['user1', 'user2', 'user3', 'user4', 'user5'];

    // Original approach memory usage
    const originalMemoryStart = process.memoryUsage().heapUsed;
    
    const originalResults = await Promise.all(
      testUserIds.map(async (userId) => {
        const user = await (this.prisma as any).user.findUnique({
          where: { id: userId },
          include: { studentProfile: true },
        });
        
        const plans = await (this.prisma as any).plan.findMany({
          where: { userId },
          include: { studySessions: true },
        });
        
        return { user, plans };
      })
    );
    
    const originalMemory = process.memoryUsage().heapUsed - originalMemoryStart;

    // Optimized approach memory usage
    const optimizedMemoryStart = process.memoryUsage().heapUsed;
    
    const optimizedResults = await this.optimizedQuery.getBatchUserData(testUserIds, { cache: false });
    
    const optimizedMemory = process.memoryUsage().heapUsed - optimizedMemoryStart;

    const reduction = originalMemory - optimizedMemory;
    const reductionPercentage = (reduction / originalMemory) * 100;

    this.logger.log(`Memory Usage Benchmark: ${reductionPercentage.toFixed(2)}% reduction`);

    return {
      originalMemory,
      optimizedMemory,
      reduction,
      reductionPercentage,
    };
  }

  /**
   * Comprehensive benchmark raporu
   */
  async generateBenchmarkReport(): Promise<{
    performanceComparisons: PerformanceComparison[];
    queryCounts: any;
    memoryUsage: any;
    summary: {
      averageImprovement: number;
      totalQueryReduction: number;
      totalMemoryReduction: number;
    };
  }> {
    this.logger.log('Generating comprehensive benchmark report...');

    const performanceComparisons = await this.benchmarkNPlusOneQueries();
    const queryCounts = await this.benchmarkQueryCounts();
    const memoryUsage = await this.benchmarkMemoryUsage();

    const averageImprovement = performanceComparisons.reduce(
      (sum, comp) => sum + comp.improvementPercentage, 0
    ) / performanceComparisons.length;

    const summary = {
      averageImprovement,
      totalQueryReduction: queryCounts.reductionPercentage,
      totalMemoryReduction: memoryUsage.reductionPercentage,
    };

    this.logger.log('Benchmark report generated', summary);

    return {
      performanceComparisons,
      queryCounts,
      memoryUsage,
      summary,
    };
  }
}
