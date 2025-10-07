import { 
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConnectionManagerService } from './connection-manager.service';
import { EventValidatorService } from './event-validator.service';
import { WebSocketMetricsService } from '../monitoring/websocket-metrics.service';

@WebSocketGateway({ 
  cors: { origin: '*', credentials: true },
  namespace: '/realtime',
  transports: ['websocket', 'polling']
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly eventValidator: EventValidatorService,
    private readonly metrics: WebSocketMetricsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`New connection attempt: ${client.id}`);
      
      // ConnectionManager ile bağlantıyı yönet
      await this.connectionManager.handleConnection(client);
      
      // Başarılı bağlantı
      client.emit('connected', { 
        socketId: client.id,
        timestamp: new Date(),
        server: 'okuz-realtime'
      });
      
      this.logger.log(`Connection established: ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      client.emit('error', { message: 'Connection failed', code: 'CONNECTION_ERROR' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Connection disconnecting: ${client.id}`);
      
      // ConnectionManager ile bağlantıyı yönet
      await this.connectionManager.handleDisconnection(client);
      
      this.logger.log(`Connection closed: ${client.id}`);
    } catch (error) {
      this.logger.error(`Disconnection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string }) {
    try {
      const success = await this.connectionManager.joinRoom(client.id, data.room);
      if (success) {
        client.emit('joined_room', { room: data.room, success: true });
      } else {
        client.emit('error', { message: 'Failed to join room', code: 'JOIN_ROOM_ERROR' });
      }
    } catch (error) {
      this.logger.error(`Join room error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      client.emit('error', { message: 'Failed to join room', code: 'JOIN_ROOM_ERROR' });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string }) {
    try {
      const success = await this.connectionManager.leaveRoom(client.id, data.room);
      if (success) {
        client.emit('left_room', { room: data.room, success: true });
      } else {
        client.emit('error', { message: 'Failed to leave room', code: 'LEAVE_ROOM_ERROR' });
      }
    } catch (error) {
      this.logger.error(`Leave room error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      client.emit('error', { message: 'Failed to leave room', code: 'LEAVE_ROOM_ERROR' });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      // Event validation
      const connectionInfo = this.connectionManager.getConnectionInfo(client.id);
      if (!connectionInfo) {
        client.emit('error', { message: 'Connection not found', code: 'CONNECTION_NOT_FOUND' });
        return;
      }

      const validation = await this.eventValidator.validateEvent(
        'chat.message',
        data,
        connectionInfo,
        client.id
      );

      if (!validation.isValid) {
        client.emit('error', { 
          message: 'Message validation failed', 
          code: 'VALIDATION_ERROR',
          errors: validation.errors
        });
        return;
      }

      // Mesajı gönder
      if (data.room) {
        this.server.to(data.room).emit('message', {
          ...validation.sanitizedData,
          timestamp: new Date(),
          socketId: client.id,
        });
      } else {
        client.emit('error', { message: 'Room not specified', code: 'ROOM_REQUIRED' });
      }
    } catch (error) {
      this.logger.error(`Send message error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      client.emit('error', { message: 'Failed to send message', code: 'SEND_MESSAGE_ERROR' });
    }
  }

  // Helper publish methods - Enhanced with ConnectionManager
  async publishPlanUpdated(userId: string, data: any) {
    try {
      const success = await this.connectionManager.sendToUser(userId, 'plan_updated', data);
      if (!success) {
        this.logger.warn(`Failed to send plan update to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Plan update publish error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async publishSessionCompleted(userId: string, data: any) {
    try {
      const success = await this.connectionManager.sendToUser(userId, 'session_completed', data);
      if (!success) {
        this.logger.warn(`Failed to send session completion to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Session completion publish error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async publishProgressUpdated(userId: string, data: any) {
    try {
      const success = await this.connectionManager.sendToUser(userId, 'progress_updated', data);
      if (!success) {
        this.logger.warn(`Failed to send progress update to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Progress update publish error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async publishUserNotification(userId: string, data: any) {
    try {
      const success = await this.connectionManager.sendToUser(userId, 'user_notification', data);
      if (!success) {
        this.logger.warn(`Failed to send notification to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Notification publish error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // New enhanced methods
  async publishToRoom(room: string, event: string, data: any) {
    try {
      const success = await this.connectionManager.sendToRoom(room, event, data);
      if (!success) {
        this.logger.warn(`Failed to send ${event} to room ${room}`);
      }
    } catch (error) {
      this.logger.error(`Room publish error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async broadcast(event: string, data: any) {
    try {
      const success = await this.connectionManager.broadcast(event, data);
      if (!success) {
        this.logger.warn(`Failed to broadcast ${event}`);
      }
    } catch (error) {
      this.logger.error(`Broadcast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Eksik methodları ekleyelim
  async joinRoom(client: Socket, data: any) {
    try {
      client.join(data.room);
      client.emit('joined-room', { room: data.room });
    } catch (error) {
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  async leaveRoom(client: Socket, data: any) {
    try {
      client.leave(data.room);
      client.emit('left-room', { room: data.room });
    } catch (error) {
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  async sendMessage(client: Socket, data: any) {
    try {
      (client as any).to(data.room);
      client.emit('message', {
        message: data.message,
        userId: data.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  async broadcastToUser(data: any) {
    try {
      this.server.to(`user:${data.userId}`).emit('broadcast', data);
    } catch (error) {
      throw new Error('Failed to broadcast to user');
    }
  }

  async broadcastToRoom(data: any) {
    try {
      this.server.to(data.room).emit('broadcast', data);
    } catch (error) {
      throw new Error('Failed to broadcast to room');
    }
  }

  async getConnectedUsers() {
    try {
      return this.server.sockets.sockets.size;
    } catch (error) {
      throw new Error('Failed to get connected users');
    }
  }

  // OutboxWorker burayı kullanarak kullanıcının kanalına event publish edebilir
  publishUserEvent(userId: string, payload: any) {
    try {
      const client = (this as any).getClientByUserId?.(userId);
      if (client) {
        client.emit('delta', payload);
      }
    } catch {}
  }
}

