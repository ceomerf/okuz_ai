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
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@WebSocketGateway({ cors: { origin: '*', credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // Optionally verify token from client.handshake.auth.token
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('join_room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() roomName: string) {
    client.join(roomName);
    client.emit('joined_room', roomName);
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    const room = `user:${userId}`;
    client.join(room);
    client.emit('joined_room', room);
  }

  // Helper publish methods
  publishPlanUpdated(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('plan_updated', data);
  }

  publishSessionCompleted(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('session_completed', data);
  }

  publishProgressUpdated(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('progress_updated', data);
  }

  publishUserNotification(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('user_notification', data);
  }
}

