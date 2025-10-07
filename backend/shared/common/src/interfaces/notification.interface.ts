export interface Notification {
  id: string;
  userId: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'COACHING' | 'SYSTEM';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  data: Record<string, any>;
  channels: NotificationChannel[];
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationChannel {
  type: 'PUSH' | 'EMAIL' | 'SMS' | 'WEBSOCKET' | 'IN_APP';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  metadata: Record<string, any>;
}

export interface PushNotification {
  id: string;
  userId: string;
  deviceToken: string;
  title: string;
  body: string;
  data: Record<string, any>;
  badge?: number;
  sound?: string;
  category?: string;
  threadId?: string;
  priority: 'normal' | 'high';
  ttl: number; // seconds
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface EmailNotification {
  id: string;
  userId: string;
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  templateId?: string;
  variables: Record<string, any>;
  attachments: EmailAttachment[];
  priority: 'low' | 'normal' | 'high';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  sentAt?: Date;
  deliveredAt?: Date;
  bouncedAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType: string;
  size: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: 'PUSH' | 'EMAIL' | 'SMS' | 'WEBSOCKET' | 'IN_APP';
  subject?: string;
  title?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  channel: 'PUSH' | 'EMAIL' | 'SMS' | 'WEBSOCKET' | 'IN_APP';
  type: string;
  enabled: boolean;
  frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'NEVER';
  quietHours: {
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
  filters: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationStats {
  userId: string;
  period: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  channels: {
    push: number;
    email: number;
    sms: number;
    websocket: number;
    inApp: number;
  };
  types: Record<string, number>;
  createdAt: Date;
}
