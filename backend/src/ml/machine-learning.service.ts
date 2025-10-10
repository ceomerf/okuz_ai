import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MLModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'recommendation' | 'anomaly_detection';
  status: 'training' | 'ready' | 'deployed' | 'failed';
  accuracy?: number;
  version: string;
  createdAt: string;
  lastTrained: string;
  trainingData: {
    size: number;
    features: string[];
    target: string;
  };
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
}

export interface MLPrediction {
  id: string;
  modelId: string;
  input: any;
  output: any;
  confidence: number;
  timestamp: string;
  processingTime: number;
}

export interface MLTrainingJob {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  metrics: {
    accuracy: number;
    loss: number;
    epochs: number;
  };
  error?: string;
}

export interface MLRecommendation {
  userId: string;
  itemId: string;
  score: number;
  reason: string;
  category: string;
  timestamp: string;
}

export interface MLDashboard {
  models: MLModel[];
  recentPredictions: MLPrediction[];
  trainingJobs: MLTrainingJob[];
  recommendations: MLRecommendation[];
  metrics: {
    totalModels: number;
    activeModels: number;
    totalPredictions: number;
    averageAccuracy: number;
    totalTrainingJobs: number;
    activeTrainingJobs: number;
  };
  performance: {
    dailyPredictions: { date: string; count: number }[];
    modelAccuracy: { modelId: string; name: string; accuracy: number }[];
    trainingProgress: { jobId: string; progress: number }[];
  };
}

@Injectable()
export class MachineLearningService {
  private readonly logger = new Logger(MachineLearningService.name);

  constructor(private prisma: PrismaService) {}

  async getMLDashboard(): Promise<MLDashboard> {
    try {
      const [models, recentPredictions, trainingJobs, recommendations, metrics, performance] = await Promise.all([
        this.getMLModels(),
        this.getRecentPredictions(),
        this.getTrainingJobs(),
        this.getRecommendations(),
        this.getMLMetrics(),
        this.getMLPerformance(),
      ]);

      return {
        models,
        recentPredictions,
        trainingJobs,
        recommendations,
        metrics,
        performance,
      };
    } catch (error) {
      this.logger.error('Failed to get ML dashboard:', error);
      throw error;
    }
  }

  private async getMLModels(): Promise<MLModel[]> {
    try {
      const models = await this.prisma.mLModel.findMany({
        orderBy: { lastTrained: 'desc' },
      });

      return models.map(model => ({
        id: model.id,
        name: model.name,
        type: model.type as any,
        status: model.status as any,
        accuracy: model.accuracy,
        version: model.version,
        createdAt: model.createdAt.toISOString(),
        lastTrained: model.lastTrained.toISOString(),
        trainingData: {
          size: model.trainingDataSize || 0,
          features: model.features || [],
          target: model.target || '',
        },
        performance: {
          precision: model.precision || 0,
          recall: model.recall || 0,
          f1Score: model.f1Score || 0,
          auc: model.auc || 0,
        },
      }));
    } catch (error) {
      this.logger.warn('Could not get ML models:', error);
      return [];
    }
  }

  private async getRecentPredictions(): Promise<MLPrediction[]> {
    try {
      const predictions = await this.prisma.mLPrediction.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      return predictions.map(prediction => ({
        id: prediction.id,
        modelId: prediction.modelId,
        input: prediction.input,
        output: prediction.output,
        confidence: prediction.confidence,
        timestamp: prediction.timestamp.toISOString(),
        processingTime: prediction.processingTime,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent predictions:', error);
      return [];
    }
  }

  private async getTrainingJobs(): Promise<MLTrainingJob[]> {
    try {
      const jobs = await this.prisma.mLTrainingJob.findMany({
        take: 10,
        orderBy: { startTime: 'desc' },
      });

      return jobs.map(job => ({
        id: job.id,
        modelId: job.modelId,
        status: job.status as any,
        progress: job.progress,
        startTime: job.startTime.toISOString(),
        endTime: job.endTime?.toISOString(),
        metrics: {
          accuracy: job.accuracy || 0,
          loss: job.loss || 0,
          epochs: job.epochs || 0,
        },
        error: job.error,
      }));
    } catch (error) {
      this.logger.warn('Could not get training jobs:', error);
      return [];
    }
  }

  private async getRecommendations(): Promise<MLRecommendation[]> {
    try {
      const recommendations = await this.prisma.mLRecommendation.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      return recommendations.map(rec => ({
        userId: rec.userId,
        itemId: rec.itemId,
        score: rec.score,
        reason: rec.reason,
        category: rec.category,
        timestamp: rec.timestamp.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get recommendations:', error);
      return [];
    }
  }

  private async getMLMetrics() {
    try {
      const [totalModels, activeModels, totalPredictions, averageAccuracy, totalTrainingJobs, activeTrainingJobs] = await Promise.all([
        this.getTotalModels(),
        this.getActiveModels(),
        this.getTotalPredictions(),
        this.getAverageAccuracy(),
        this.getTotalTrainingJobs(),
        this.getActiveTrainingJobs(),
      ]);

      return {
        totalModels,
        activeModels,
        totalPredictions,
        averageAccuracy,
        totalTrainingJobs,
        activeTrainingJobs,
      };
    } catch (error) {
      this.logger.warn('Could not get ML metrics:', error);
      return {
        totalModels: 0,
        activeModels: 0,
        totalPredictions: 0,
        averageAccuracy: 0,
        totalTrainingJobs: 0,
        activeTrainingJobs: 0,
      };
    }
  }

  private async getTotalModels(): Promise<number> {
    try {
      return await this.prisma.mLModel.count();
    } catch (error) {
      this.logger.warn('Could not get total models:', error);
      return 0;
    }
  }

  private async getActiveModels(): Promise<number> {
    try {
      return await this.prisma.mLModel.count({
        where: { status: 'deployed' },
      });
    } catch (error) {
      this.logger.warn('Could not get active models:', error);
      return 0;
    }
  }

  private async getTotalPredictions(): Promise<number> {
    try {
      return await this.prisma.mLPrediction.count();
    } catch (error) {
      this.logger.warn('Could not get total predictions:', error);
      return 0;
    }
  }

  private async getAverageAccuracy(): Promise<number> {
    try {
      const result = await this.prisma.mLModel.aggregate({
        _avg: { accuracy: true },
        where: { accuracy: { not: null } },
      });
      return result._avg.accuracy || 0;
    } catch (error) {
      this.logger.warn('Could not get average accuracy:', error);
      return 0;
    }
  }

  private async getTotalTrainingJobs(): Promise<number> {
    try {
      return await this.prisma.mLTrainingJob.count();
    } catch (error) {
      this.logger.warn('Could not get total training jobs:', error);
      return 0;
    }
  }

  private async getActiveTrainingJobs(): Promise<number> {
    try {
      return await this.prisma.mLTrainingJob.count({
        where: { status: 'running' },
      });
    } catch (error) {
      this.logger.warn('Could not get active training jobs:', error);
      return 0;
    }
  }

  private async getMLPerformance() {
    try {
      const [dailyPredictions, modelAccuracy, trainingProgress] = await Promise.all([
        this.getDailyPredictions(),
        this.getModelAccuracy(),
        this.getTrainingProgress(),
      ]);

      return {
        dailyPredictions,
        modelAccuracy,
        trainingProgress,
      };
    } catch (error) {
      this.logger.warn('Could not get ML performance:', error);
      return {
        dailyPredictions: [],
        modelAccuracy: [],
        trainingProgress: [],
      };
    }
  }

  private async getDailyPredictions() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const predictions = await this.prisma.mLPrediction.findMany({
      where: {
        timestamp: { gte: last30Days },
      },
      select: { timestamp: true },
    });

    const dailyCounts = new Map<string, number>();
    
    predictions.forEach(prediction => {
      const date = prediction.timestamp.toISOString().split('T')[0];
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });

    return Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getModelAccuracy() {
    try {
      const models = await this.prisma.mLModel.findMany({
        where: { accuracy: { not: null } },
        select: { id: true, name: true, accuracy: true },
        orderBy: { accuracy: 'desc' },
        take: 10,
      });

      return models.map(model => ({
        modelId: model.id,
        name: model.name,
        accuracy: model.accuracy || 0,
      }));
    } catch (error) {
      this.logger.warn('Could not get model accuracy:', error);
      return [];
    }
  }

  private async getTrainingProgress() {
    try {
      const jobs = await this.prisma.mLTrainingJob.findMany({
        where: { status: 'running' },
        select: { id: true, progress: true },
      });

      return jobs.map(job => ({
        jobId: job.id,
        progress: job.progress,
      }));
    } catch (error) {
      this.logger.warn('Could not get training progress:', error);
      return [];
    }
  }

  async createModel(modelData: {
    name: string;
    type: 'classification' | 'regression' | 'clustering' | 'recommendation' | 'anomaly_detection';
    trainingDataSize: number;
    features: string[];
    target: string;
  }): Promise<MLModel> {
    try {
      const model = await this.prisma.mLModel.create({
        data: {
          name: modelData.name,
          type: modelData.type,
          status: 'training',
          version: '1.0.0',
          trainingDataSize: modelData.trainingDataSize,
          features: modelData.features,
          target: modelData.target,
          createdAt: new Date(),
          lastTrained: new Date(),
        },
      });

      return {
        id: model.id,
        name: model.name,
        type: model.type as any,
        status: model.status as any,
        accuracy: model.accuracy,
        version: model.version,
        createdAt: model.createdAt.toISOString(),
        lastTrained: model.lastTrained.toISOString(),
        trainingData: {
          size: model.trainingDataSize,
          features: model.features || [],
          target: model.target || '',
        },
        performance: {
          precision: model.precision || 0,
          recall: model.recall || 0,
          f1Score: model.f1Score || 0,
          auc: model.auc || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create model:', error);
      throw error;
    }
  }

  async trainModel(modelId: string, trainingData: any[]): Promise<MLTrainingJob> {
    try {
      const job = await this.prisma.mLTrainingJob.create({
        data: {
          modelId,
          status: 'pending',
          progress: 0,
          startTime: new Date(),
        },
      });

      // Arka planda training'i başlat
      this.startTraining(job.id, modelId, trainingData);

      return {
        id: job.id,
        modelId: job.modelId,
        status: job.status as any,
        progress: job.progress,
        startTime: job.startTime.toISOString(),
        endTime: job.endTime?.toISOString(),
        metrics: {
          accuracy: job.accuracy || 0,
          loss: job.loss || 0,
          epochs: job.epochs || 0,
        },
        error: job.error,
      };
    } catch (error) {
      this.logger.error('Failed to train model:', error);
      throw error;
    }
  }

  private async startTraining(jobId: string, modelId: string, trainingData: any[]): Promise<void> {
    try {
      // Job'ı running olarak işaretle
      await this.prisma.mLTrainingJob.update({
        where: { id: jobId },
        data: { status: 'running' },
      });

      // Simulated training process
      const epochs = 100;
      const batchSize = 32;
      
      for (let epoch = 0; epoch < epochs; epoch++) {
        // Simulated training step
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const progress = Math.round((epoch / epochs) * 100);
        const accuracy = Math.min(0.95, 0.5 + (epoch / epochs) * 0.45);
        const loss = Math.max(0.01, 1.0 - (epoch / epochs) * 0.99);

        await this.prisma.mLTrainingJob.update({
          where: { id: jobId },
          data: {
            progress,
            accuracy,
            loss,
            epochs: epoch + 1,
          },
        });
      }

      // Training tamamlandı
      await this.prisma.mLTrainingJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          endTime: new Date(),
          progress: 100,
        },
      });

      // Model'i güncelle
      await this.prisma.mLModel.update({
        where: { id: modelId },
        data: {
          status: 'ready',
          accuracy: 0.95,
          lastTrained: new Date(),
        },
      });

      this.logger.log(`Training job ${jobId} completed successfully`);
    } catch (error) {
      this.logger.error(`Training job ${jobId} failed:`, error);
      
      await this.prisma.mLTrainingJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          endTime: new Date(),
          error: error.message,
        },
      });
    }
  }

  async makePrediction(modelId: string, input: any): Promise<MLPrediction> {
    try {
      const startTime = Date.now();
      
      // Model'i kontrol et
      const model = await this.prisma.mLModel.findUnique({
        where: { id: modelId },
      });

      if (!model || model.status !== 'deployed') {
        throw new Error('Model not found or not deployed');
      }

      // Simulated prediction
      const output = this.simulatePrediction(input, model.type);
      const confidence = Math.random() * 0.3 + 0.7; // 0.7-1.0 arası
      const processingTime = Date.now() - startTime;

      const prediction = await this.prisma.mLPrediction.create({
        data: {
          modelId,
          input,
          output,
          confidence,
          processingTime,
          timestamp: new Date(),
        },
      });

      return {
        id: prediction.id,
        modelId: prediction.modelId,
        input: prediction.input,
        output: prediction.output,
        confidence: prediction.confidence,
        timestamp: prediction.timestamp.toISOString(),
        processingTime: prediction.processingTime,
      };
    } catch (error) {
      this.logger.error('Failed to make prediction:', error);
      throw error;
    }
  }

  private simulatePrediction(input: any, modelType: string): any {
    switch (modelType) {
      case 'classification':
        return { class: 'positive', probability: Math.random() };
      case 'regression':
        return { value: Math.random() * 100 };
      case 'clustering':
        return { cluster: Math.floor(Math.random() * 5) };
      case 'recommendation':
        return { recommendations: ['item1', 'item2', 'item3'] };
      case 'anomaly_detection':
        return { isAnomaly: Math.random() > 0.8, score: Math.random() };
      default:
        return { result: 'unknown' };
    }
  }

  async generateRecommendations(userId: string, limit: number = 10): Promise<MLRecommendation[]> {
    try {
      // Simulated recommendations
      const recommendations = [];
      
      for (let i = 0; i < limit; i++) {
        const rec = await this.prisma.mLRecommendation.create({
          data: {
            userId,
            itemId: `item_${Math.floor(Math.random() * 1000)}`,
            score: Math.random(),
            reason: 'Based on your learning history',
            category: 'course',
            timestamp: new Date(),
          },
        });

        recommendations.push({
          userId: rec.userId,
          itemId: rec.itemId,
          score: rec.score,
          reason: rec.reason,
          category: rec.category,
          timestamp: rec.timestamp.toISOString(),
        });
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  async deployModel(modelId: string): Promise<void> {
    try {
      await this.prisma.mLModel.update({
        where: { id: modelId },
        data: { status: 'deployed' },
      });

      this.logger.log(`Model ${modelId} deployed successfully`);
    } catch (error) {
      this.logger.error('Failed to deploy model:', error);
      throw error;
    }
  }

  async undeployModel(modelId: string): Promise<void> {
    try {
      await this.prisma.mLModel.update({
        where: { id: modelId },
        data: { status: 'ready' },
      });

      this.logger.log(`Model ${modelId} undeployed successfully`);
    } catch (error) {
      this.logger.error('Failed to undeploy model:', error);
      throw error;
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    try {
      await this.prisma.mLModel.delete({
        where: { id: modelId },
      });

      this.logger.log(`Model ${modelId} deleted successfully`);
    } catch (error) {
      this.logger.error('Failed to delete model:', error);
      throw error;
    }
  }

  async getModelPerformance(modelId: string): Promise<any> {
    try {
      const model = await this.prisma.mLModel.findUnique({
        where: { id: modelId },
      });

      if (!model) {
        throw new Error('Model not found');
      }

      const predictions = await this.prisma.mLPrediction.findMany({
        where: { modelId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
      const avgProcessingTime = predictions.reduce((sum, p) => sum + p.processingTime, 0) / predictions.length;

      return {
        modelId,
        name: model.name,
        accuracy: model.accuracy,
        totalPredictions: predictions.length,
        averageConfidence: avgConfidence,
        averageProcessingTime: avgProcessingTime,
        performance: {
          precision: model.precision,
          recall: model.recall,
          f1Score: model.f1Score,
          auc: model.auc,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get model performance:', error);
      throw error;
    }
  }
}
