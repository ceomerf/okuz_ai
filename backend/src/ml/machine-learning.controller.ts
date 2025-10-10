import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { MachineLearningService, MLDashboard, MLModel, MLPrediction, MLTrainingJob, MLRecommendation } from './machine-learning.service';

@Controller('ml')
export class MachineLearningController {
  constructor(private readonly machineLearningService: MachineLearningService) {}

  @Get('dashboard')
  async getMLDashboard(): Promise<MLDashboard> {
    try {
      return await this.machineLearningService.getMLDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get ML dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models')
  async createModel(@Body() modelData: {
    name: string;
    type: 'classification' | 'regression' | 'clustering' | 'recommendation' | 'anomaly_detection';
    trainingDataSize: number;
    features: string[];
    target: string;
  }): Promise<MLModel> {
    try {
      return await this.machineLearningService.createModel(modelData);
    } catch (error) {
      throw new HttpException(
        'Failed to create model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  async getModels(): Promise<MLModel[]> {
    try {
      const dashboard = await this.machineLearningService.getMLDashboard();
      return dashboard.models;
    } catch (error) {
      throw new HttpException(
        'Failed to get models',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models/:modelId')
  async getModel(@Param('modelId') modelId: string): Promise<MLModel> {
    try {
      const dashboard = await this.machineLearningService.getMLDashboard();
      const model = dashboard.models.find(m => m.id === modelId);
      
      if (!model) {
        throw new HttpException('Model not found', HttpStatus.NOT_FOUND);
      }
      
      return model;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models/:modelId/train')
  async trainModel(
    @Param('modelId') modelId: string,
    @Body() trainingData: { data: any[] }
  ): Promise<MLTrainingJob> {
    try {
      return await this.machineLearningService.trainModel(modelId, trainingData.data);
    } catch (error) {
      throw new HttpException(
        'Failed to train model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models/:modelId/predict')
  async makePrediction(
    @Param('modelId') modelId: string,
    @Body() inputData: { input: any }
  ): Promise<MLPrediction> {
    try {
      return await this.machineLearningService.makePrediction(modelId, inputData.input);
    } catch (error) {
      throw new HttpException(
        'Failed to make prediction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models/:modelId/deploy')
  async deployModel(@Param('modelId') modelId: string): Promise<void> {
    try {
      await this.machineLearningService.deployModel(modelId);
    } catch (error) {
      throw new HttpException(
        'Failed to deploy model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models/:modelId/undeploy')
  async undeployModel(@Param('modelId') modelId: string): Promise<void> {
    try {
      await this.machineLearningService.undeployModel(modelId);
    } catch (error) {
      throw new HttpException(
        'Failed to undeploy model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('models/:modelId')
  async deleteModel(@Param('modelId') modelId: string): Promise<void> {
    try {
      await this.machineLearningService.deleteModel(modelId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models/:modelId/performance')
  async getModelPerformance(@Param('modelId') modelId: string): Promise<any> {
    try {
      return await this.machineLearningService.getModelPerformance(modelId);
    } catch (error) {
      throw new HttpException(
        'Failed to get model performance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('training-jobs')
  async getTrainingJobs(): Promise<MLTrainingJob[]> {
    try {
      const dashboard = await this.machineLearningService.getMLDashboard();
      return dashboard.trainingJobs;
    } catch (error) {
      throw new HttpException(
        'Failed to get training jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('predictions')
  async getPredictions(@Query('modelId') modelId?: string): Promise<MLPrediction[]> {
    try {
      const dashboard = await this.machineLearningService.getMLDashboard();
      let predictions = dashboard.recentPredictions;
      
      if (modelId) {
        predictions = predictions.filter(p => p.modelId === modelId);
      }
      
      return predictions;
    } catch (error) {
      throw new HttpException(
        'Failed to get predictions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recommendations/:userId')
  async getRecommendations(
    @Param('userId') userId: string,
    @Query('limit') limit?: string
  ): Promise<MLRecommendation[]> {
    try {
      const limitNumber = limit ? parseInt(limit, 10) : 10;
      return await this.machineLearningService.generateRecommendations(userId, limitNumber);
    } catch (error) {
      throw new HttpException(
        'Failed to get recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
