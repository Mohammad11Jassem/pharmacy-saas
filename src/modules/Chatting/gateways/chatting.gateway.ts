import { Injectable, Logger } from '@nestjs/common';

import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Namespace, Socket } from 'socket.io';

import { ChatSocketAuthService } from '../services/chat-socket-auth.service.js';

import {
  ChatRequestFailedEvent,
  ChatRequestSucceededEvent,
} from '../types/chat-realtime-events.types.js';

import {
  buildPharmacyChatRoom,
  CHATTING_SOCKET_NAMESPACE,
  CHAT_REQUEST_FAILED_EVENT,
  CHAT_REQUEST_SUCCEEDED_EVENT,
  CHAT_SOCKET_READY_EVENT,
} from './chatting-gateway.constants.js';

type ChatConnectionReadyEvent = {
  pharmacyId: number;
  connectedAt: string;
};

interface ChatClientToServerEvents {
  // لا نستقبل أحداثاً من Frontend حالياً.
}

interface ChatServerToClientEvents {
  'chat.connection.ready': (payload: ChatConnectionReadyEvent) => void;

  'chat.request.succeeded': (payload: ChatRequestSucceededEvent) => void;

  'chat.request.failed': (payload: ChatRequestFailedEvent) => void;
}

interface ChatInterServerEvents {
  // سنستخدمها لاحقاً فقط عند وجود أكثر من Server.
}

type ChatSocketData = {
  pharmacyId?: number;
};

// type ChatSocket = Socket<
//   Record<string, never>,
//   Record<string, unknown>,
//   Record<string, never>,
//   ChatSocketData
// >;

type ChatSocket = Socket<
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  ChatInterServerEvents,
  ChatSocketData
>;

@Injectable()
@WebSocketGateway({
  namespace: CHATTING_SOCKET_NAMESPACE,

  /*
   * مناسب أثناء التطوير.
   * لاحقاً نحدد FRONTEND_ORIGIN بدقة.
   */
  cors: {
    origin: true,
  },
})
export class ChattingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChattingGateway.name);

  // @WebSocketServer()
  // private namespace!: Namespace;

  @WebSocketServer()
  private namespace!: Namespace<
    ChatClientToServerEvents,
    ChatServerToClientEvents,
    ChatInterServerEvents,
    ChatSocketData
  >;

  constructor(private readonly chatSocketAuthService: ChatSocketAuthService) {}

  afterInit(
    namespace: Namespace<
      ChatClientToServerEvents,
      ChatServerToClientEvents,
      ChatInterServerEvents,
      ChatSocketData
    >,
  ): void {
    /*
     * Middleware تعمل مرة واحدة عند كل اتصال.
     * في حال فشلها سيستقبل العميل connect_error.
     */
    namespace.use(async (socket: ChatSocket, next) => {
      try {
        const authenticated =
          await this.chatSocketAuthService.authenticate(socket);

        socket.data.pharmacyId = authenticated.pharmacyId;

        next();
      } catch (error: unknown) {
        const authenticationError = new Error(
          'Unauthorized chat socket connection.',
        ) as Error & {
          data?: {
            code: string;
          };
        };

        authenticationError.data = {
          code: 'CHAT_SOCKET_UNAUTHORIZED',
        };

        this.logger.warn(
          `Rejected chat socket ${socket.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        next(authenticationError);
      }
    });

    this.logger.log(
      `Chatting WebSocket namespace initialized: ${CHATTING_SOCKET_NAMESPACE}`,
    );
  }

  async handleConnection(client: ChatSocket): Promise<void> {
    const pharmacyId = client.data.pharmacyId;

    if (!pharmacyId) {
      client.disconnect(true);
      return;
    }

    const room = buildPharmacyChatRoom(pharmacyId);

    await client.join(room);

    client.emit(CHAT_SOCKET_READY_EVENT, {
      pharmacyId,
      connectedAt: new Date().toISOString(),
    });

    this.logger.log(`Chat socket ${client.id} joined ${room}.`);
  }

  handleDisconnect(client: ChatSocket): void {
    this.logger.log(`Chat socket ${client.id} disconnected.`);
  }

  emitRequestSucceeded(
    pharmacyId: number,
    payload: ChatRequestSucceededEvent,
  ): void {
    const room = buildPharmacyChatRoom(pharmacyId);

    this.namespace.to(room).emit(CHAT_REQUEST_SUCCEEDED_EVENT, payload);

    this.logger.log(
      `Emitted ${CHAT_REQUEST_SUCCEEDED_EVENT} for RagRequest ${payload.ragRequestId} to ${room}.`,
    );
  }

  emitRequestFailed(pharmacyId: number, payload: ChatRequestFailedEvent): void {
    const room = buildPharmacyChatRoom(pharmacyId);

    this.namespace.to(room).emit(CHAT_REQUEST_FAILED_EVENT, payload);

    this.logger.log(
      `Emitted ${CHAT_REQUEST_FAILED_EVENT} for RagRequest ${payload.ragRequestId} to ${room}.`,
    );
  }
}
