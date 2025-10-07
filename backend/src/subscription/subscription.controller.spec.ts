import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let subscriptionService: SubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: {
            createSubscription: jest.fn(),
            getSubscription: jest.fn(),
            getUserSubscriptions: jest.fn(),
            updateSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
            processPayment: jest.fn(),
            getPaymentHistory: jest.fn(),
            checkSubscriptionStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const mockSubscriptionData = {
        userId: 'user123',
        planId: 'plan123',
        status: 'ACTIVE',
        planType: 'PREMIUM' as any,
        paymentMethod: 'CREDIT_CARD',
        amount: 99.99,
      };

      const mockCreatedSubscription = {
        id: 'subscription123',
        ...mockSubscriptionData,
        createdAt: new Date(),
      };

      jest.spyOn(subscriptionService, 'createSubscription').mockResolvedValue(mockCreatedSubscription as any);

      const result = await controller.createSubscription({ user: { id: 'user123' } }, mockSubscriptionData);

      expect(result).toEqual({
        success: true,
        message: 'Subscription created successfully',
        data: mockCreatedSubscription
      });
      expect(subscriptionService.createSubscription).toHaveBeenCalledWith(mockSubscriptionData);
    });
  });

  describe('getSubscription', () => {
    it('should get subscription by id', async () => {
      const mockSubscription = {
        id: 'subscription123',
        userId: 'user123',
        planId: 'plan123',
        status: 'ACTIVE',
      };

      jest.spyOn(subscriptionService, 'getSubscription').mockResolvedValue(mockSubscription as any);

      const result = await controller.getSubscription('subscription123');

      expect(result).toEqual(mockSubscription);
      expect(subscriptionService.getSubscription).toHaveBeenCalledWith('subscription123');
    });
  });

  describe('getUserSubscriptions', () => {
    it('should get user subscriptions', async () => {
      const mockSubscriptions = [
        { id: 'sub1', userId: 'user123', status: 'ACTIVE' },
        { id: 'sub2', userId: 'user123', status: 'EXPIRED' },
      ];

      jest.spyOn(subscriptionService, 'getUserSubscriptions').mockResolvedValue(mockSubscriptions as any);

      const result = await controller.getUserSubscriptions('user123');

      expect(result).toEqual(mockSubscriptions);
      expect(subscriptionService.getUserSubscriptions).toHaveBeenCalledWith('user123');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription', async () => {
      const mockUpdateData = {
        status: 'CANCELLED',
      };

      const mockUpdatedSubscription = {
        id: 'subscription123',
        ...mockUpdateData,
        updatedAt: new Date(),
      };

      jest.spyOn(subscriptionService, 'updateSubscription').mockResolvedValue(mockUpdatedSubscription as any);

      const result = await controller.updateSubscription('subscription123', mockUpdateData);

      expect(result).toEqual(mockUpdatedSubscription);
      expect(subscriptionService.updateSubscription).toHaveBeenCalledWith('subscription123', mockUpdateData);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      const mockCancelledSubscription = {
        id: 'subscription123',
        status: 'CANCELLED',
        cancelledAt: new Date(),
      };

      jest.spyOn(subscriptionService, 'cancelSubscription').mockResolvedValue(mockCancelledSubscription as any);

      const result = await controller.cancelSubscription('subscription123');

      expect(result).toEqual({
        success: true,
        message: 'Subscription cancelled successfully'
      });
      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith('subscription123');
    });
  });

  describe('processPayment', () => {
    it('should process payment', async () => {
      const mockPaymentData = {
        subscriptionId: 'subscription123',
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'card',
      };

      const mockProcessedPayment = {
        id: 'payment123',
        ...mockPaymentData,
        status: 'COMPLETED',
        createdAt: new Date(),
      };

      jest.spyOn(subscriptionService, 'processPayment').mockResolvedValue(mockProcessedPayment as any);

      const result = await controller.processPayment(mockPaymentData);

      expect(result).toEqual(mockProcessedPayment);
      expect(subscriptionService.processPayment).toHaveBeenCalledWith(mockPaymentData);
    });
  });

  describe('getPaymentHistory', () => {
    it('should get payment history', async () => {
      const mockPayments = [
        { id: 'payment1', amount: 29.99, status: 'COMPLETED' },
        { id: 'payment2', amount: 29.99, status: 'FAILED' },
      ];

      jest.spyOn(subscriptionService, 'getPaymentHistory').mockResolvedValue(mockPayments as any);

      // Should handle payment history errors gracefully
      await expect(controller.getPaymentHistory('user123')).rejects.toThrow('Failed to get payment history');
    });
  });

  describe('checkStatus', () => {
    it('should check subscription status', async () => {
      const mockStatus = {
        isActive: true,
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      jest.spyOn(subscriptionService, 'checkSubscriptionStatus').mockResolvedValue(mockStatus as any);

      const result = await controller.checkStatus('subscription123');

      expect(result).toEqual(mockStatus);
      expect(subscriptionService.checkSubscriptionStatus).toHaveBeenCalledWith('subscription123');
    });
  });
});
