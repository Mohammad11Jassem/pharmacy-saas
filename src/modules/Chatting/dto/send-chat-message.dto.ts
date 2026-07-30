import { Transform } from 'class-transformer';
import {
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { RAG_MAX_USER_MESSAGE_CHARACTERS } from '../chatting.constants';

export class SendChatMessageDto {
  /**
   * ينشئه Frontend مرة واحدة لكل محاولة إرسال.
   *
   * فائدته منع تكرار السؤال عند:
   * - إعادة المحاولة.
   * - ضعف الاتصال.
   * - ضغط زر الإرسال مرتين.
   */
  @IsUUID()
  clientRequestId: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim();
  })
  @IsString()
  @MinLength(1)
  @MaxLength(RAG_MAX_USER_MESSAGE_CHARACTERS)
  content: string;
}