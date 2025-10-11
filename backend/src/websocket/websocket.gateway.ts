import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketService } from './websocket.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@NestWebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private webSocketService: WebSocketService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // JWT token'ı doğrula
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn('Token bulunamadı, bağlantı reddedildi');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      // Kullanıcıyı bağlı kullanıcılar listesine ekle
      this.connectedUsers.set(client.userId!, client.id);
      
      // Kullanıcıya özel room'a katıl
      await client.join(`user_${client.userId}`);
      
      // Rol bazlı room'lara katıl
      if (client.userRole) {
        await client.join(`role_${client.userRole}`);
      }

      this.logger.log(`Kullanıcı bağlandı: ${client.userId} (${client.userRole})`);
      
      // Bağlantı onayı gönder
      client.emit('connected', {
        message: 'WebSocket bağlantısı başarılı',
        userId: client.userId,
        userRole: client.userRole,
      });

    } catch (error) {
      this.logger.error('WebSocket bağlantı hatası:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`Kullanıcı ayrıldı: ${client.userId}`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    try {
      await client.join(data.room);
      this.logger.log(`Kullanıcı ${client.userId} room'a katıldı: ${data.room}`);
      
      client.emit('room_joined', {
        room: data.room,
        message: 'Room\'a başarıyla katıldınız',
      });
    } catch (error) {
      this.logger.error('Room katılma hatası:', error);
      client.emit('error', { message: 'Room\'a katılamadınız' });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    try {
      await client.leave(data.room);
      this.logger.log(`Kullanıcı ${client.userId} room'dan ayrıldı: ${data.room}`);
      
      client.emit('room_left', {
        room: data.room,
        message: 'Room\'dan ayrıldınız',
      });
    } catch (error) {
      this.logger.error('Room ayrılma hatası:', error);
      client.emit('error', { message: 'Room\'dan ayrılamadınız' });
    }
  }

  @SubscribeMessage('get_online_users')
  async handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const onlineUsers = Array.from(this.connectedUsers.keys());
      client.emit('online_users', {
        users: onlineUsers,
        count: onlineUsers.length,
      });
    } catch (error) {
      this.logger.error('Online kullanıcılar getirme hatası:', error);
      client.emit('error', { message: 'Online kullanıcılar alınamadı' });
    }
  }

  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      message: 'Pong!',
    });
  }

  // Kullanıcıya özel bildirim gönder
  async sendToUser(userId: string, event: string, data: any) {
    try {
      this.server.to(`user_${userId}`).emit(event, data);
      this.logger.log(`Bildirim gönderildi: ${userId} - ${event}`);
    } catch (error) {
      this.logger.error('Kullanıcıya bildirim gönderme hatası:', error);
    }
  }

  // Role göre bildirim gönder
  async sendToRole(role: string, event: string, data: any) {
    try {
      this.server.to(`role_${role}`).emit(event, data);
      this.logger.log(`Role bildirim gönderildi: ${role} - ${event}`);
    } catch (error) {
      this.logger.error('Role bildirim gönderme hatası:', error);
    }
  }

  // Tüm kullanıcılara bildirim gönder
  async sendToAll(event: string, data: any) {
    try {
      this.server.emit(event, data);
      this.logger.log(`Genel bildirim gönderildi: ${event}`);
    } catch (error) {
      this.logger.error('Genel bildirim gönderme hatası:', error);
    }
  }

  // Room'a bildirim gönder
  async sendToRoom(room: string, event: string, data: any) {
    try {
      this.server.to(room).emit(event, data);
      this.logger.log(`Room bildirim gönderildi: ${room} - ${event}`);
    } catch (error) {
      this.logger.error('Room bildirim gönderme hatası:', error);
    }
  }

  // Bağlı kullanıcı sayısını al
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Bağlı kullanıcıları al
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
