import { 
  Controller, 
  Post, 
  Body, 
  Headers, 
  HttpStatus, 
  HttpException,
  Logger 
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

interface PaymentWebhookData {
  paymentId: string;
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  gatewayResponse: any;
}

@Controller('webhook')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  // Iyzico webhook handler
  @Post('iyzico')
  async handleIyzicoWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ) {
    try {
      this.logger.log('Iyzico webhook received:', body);

      // Webhook signature doğrulaması (production'da gerekli)
      // const signature = headers['x-iyz-signature'];
      // if (!this.verifyIyzicoSignature(body, signature)) {
      //   throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      // }

      const paymentData = this.parseIyzicoWebhook(body);
      
      if (paymentData.status === 'success') {
        await this.subscriptionService.confirmPayment(
          paymentData.paymentId,
          paymentData.transactionId,
          paymentData.gatewayResponse,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Iyzico webhook error:', error);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Stripe webhook handler
  @Post('stripe')
  async handleStripeWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ) {
    try {
      this.logger.log('Stripe webhook received:', body);

      // Webhook signature doğrulaması (production'da gerekli)
      // const signature = headers['stripe-signature'];
      // if (!this.verifyStripeSignature(body, signature)) {
      //   throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      // }

      const paymentData = this.parseStripeWebhook(body);
      
      if (paymentData.status === 'success') {
        await this.subscriptionService.confirmPayment(
          paymentData.paymentId,
          paymentData.transactionId,
          paymentData.gatewayResponse,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Stripe webhook error:', error);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Generic webhook handler
  @Post('payment')
  async handleGenericPaymentWebhook(@Body() body: PaymentWebhookData) {
    try {
      this.logger.log('Generic payment webhook received:', body);

      if (body.status === 'success') {
        await this.subscriptionService.confirmPayment(
          body.paymentId,
          body.transactionId,
          body.gatewayResponse,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Generic payment webhook error:', error);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Iyzico webhook parsing
  private parseIyzicoWebhook(body: any): PaymentWebhookData {
    // Iyzico webhook formatına göre parse et
    return {
      paymentId: body.paymentId || body.id,
      transactionId: body.transactionId || body.conversationId,
      status: body.status === 'SUCCESS' ? 'success' : 'failed',
      amount: body.price || 0,
      currency: body.currency || 'TRY',
      gatewayResponse: body,
    };
  }

  // Stripe webhook parsing
  private parseStripeWebhook(body: any): PaymentWebhookData {
    // Stripe webhook formatına göre parse et
    const event = body;
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      return {
        paymentId: paymentIntent.metadata.paymentId,
        transactionId: paymentIntent.id,
        status: 'success',
        amount: paymentIntent.amount / 100, // Stripe kuruş cinsinden tutar
        currency: paymentIntent.currency.toUpperCase(),
        gatewayResponse: event,
      };
    }

    return {
      paymentId: '',
      transactionId: '',
      status: 'failed',
      amount: 0,
      currency: 'TRY',
      gatewayResponse: event,
    };
  }

  // Iyzico signature verification (placeholder)
  private verifyIyzicoSignature(body: any, signature: string): boolean {
    // Production'da implement edilecek
    return true;
  }

  // Stripe signature verification (placeholder)
  private verifyStripeSignature(body: any, signature: string): boolean {
    // Production'da implement edilecek
    return true;
  }
} 