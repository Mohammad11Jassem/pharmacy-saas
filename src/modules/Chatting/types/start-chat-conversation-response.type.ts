import {
  RagRequestStatus,
} from '../../../generated/prisma/enums.js';

export type StartChatConversationResponse = {
  ragConversationId: number;
  ragRequestId: number;
  turnNumber: number;
  status: RagRequestStatus;
  title: string | null;
  idempotentReplay: boolean;

  userMessage: {
    ragMessageId: number;
    role: 'USER';
    content: string;
    createdAt: Date;
  };
};