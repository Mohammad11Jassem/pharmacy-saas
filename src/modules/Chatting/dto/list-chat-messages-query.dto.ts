import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

/**
 * Pagination is applied to conversation turns (RagRequest), not individual
 * messages. Each returned item contains the USER message and, when available,
 * the ASSISTANT message for the same turn.
 */
export class ListChatMessagesQueryDto extends PaginationQueryDto {}
