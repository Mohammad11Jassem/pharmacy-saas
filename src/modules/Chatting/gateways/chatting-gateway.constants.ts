export const CHATTING_SOCKET_NAMESPACE =
  '/chatting';

export const CHAT_SOCKET_READY_EVENT =
  'chat.connection.ready';

export const CHAT_REQUEST_SUCCEEDED_EVENT =
  'chat.request.succeeded';

export const CHAT_REQUEST_FAILED_EVENT =
  'chat.request.failed';

export function buildPharmacyChatRoom(
  pharmacyId: number,
): string {
  return `pharmacy:${pharmacyId}`;
}