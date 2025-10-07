import { SetMetadata } from '@nestjs/common';

export const ANALYTICS_EVENT_KEY = 'analytics_event';

/**
 * Decorator to automatically track analytics events
 */
export const TrackEvent = (event: string, properties?: Record<string, any>) => 
  SetMetadata(ANALYTICS_EVENT_KEY, { event, properties });

/**
 * Decorator to track method execution time
 */
export const TrackPerformance = (eventName: string) => 
  SetMetadata(ANALYTICS_EVENT_KEY, { event: eventName, trackPerformance: true });

/**
 * Decorator to track user engagement
 */
export const TrackEngagement = (action: string, feature?: string) => 
  SetMetadata(ANALYTICS_EVENT_KEY, { event: 'user_engagement', properties: { action, feature } });
