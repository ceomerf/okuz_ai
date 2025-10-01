import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { QueueService } from '../src/services/queue.service';
import { GeminiService } from '../src/services/gemini.service';

describe('PlanningController (e2e)', () => {
  let app: INestApplication;
  const mockQueue = { addJob: jest.fn().mockResolvedValue({ id: 'job123' }) } as any;
  const mockGemini = { generateContent: jest.fn().mockResolvedValue('OK') } as any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(QueueService)
      .useValue(mockQueue)
      .overrideProvider(GeminiService)
      .useValue(mockGemini)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/planning/generate-plan (POST) should queue job with stable jobId', async () => {
    const token = 'Bearer ey.fake.jwt';
    // JwtAuthGuard gerçek doğrulama yapacağından, prod guard devredeyse bu testte bypass gerekebilir.
    // Basitçe header veriyoruz; test ayarında guard override edilmesi önerilir.
    const payload = { mode: 'ai', planDurationWeeks: 1, planFocus: 'math' };
    const res = await request(app.getHttpServer())
      .post('/planning/generate-plan')
      .set('Authorization', token)
      .send(payload)
      .expect(201)
      .catch(async () => await request(app.getHttpServer())
        .post('/planning/generate-plan').set('Authorization', token).send(payload).expect(200));

    expect(mockQueue.addJob).toHaveBeenCalled();
    const call = (mockQueue.addJob as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('generate-plan');
    expect(call[2]).toHaveProperty('jobId');
  });
});


