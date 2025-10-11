import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/coaching-updates',
  transports: ['websocket', 'polling'],
})
export class CoachingUpdatesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CoachingUpdatesGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      await client.join(`user_${client.userId}`);
      this.logger.log(`WS connected: ${client.userId}`);
      client.emit('connected', { message: 'ok' });
    } catch (e) {
      this.logger.warn('WS auth failed');
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`WS disconnected: ${client.userId || 'unknown'}`);
  }

  @SubscribeMessage('subscribe_coach')
  async handleSubscribeCoach(client: AuthenticatedSocket, data: { coachId: string }) {
    if (!data?.coachId) return;
    await client.join(`coach_${data.coachId}`);
    client.emit('subscribed', { room: `coach_${data.coachId}` });
  }

  // Publish helpers
  async publishCoachAssigned(userId: string, coachId: string) {
    this.server.to(`user_${userId}`).emit('coach_assigned', { userId, coachId, ts: new Date().toISOString() });
  }

  async publishCoachUnassigned(userId: string, coachId: string) {
    this.server.to(`user_${userId}`).emit('coach_unassigned', { userId, coachId, ts: new Date().toISOString() });
  }

  async publishCoachNoteAdded(coachId: string, note: { id: string; studentId: string }) {
    this.server.to(`coach_${coachId}`).emit('coach_note_added', { ...note, ts: new Date().toISOString() });
  }
}


