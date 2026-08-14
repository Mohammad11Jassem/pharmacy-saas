export const RAG_MAX_USER_MESSAGE_CHARACTERS = 4_000;

/**
 * الفترة القصوى المسموحة لمعالجة الطلب قبل اعتباره منتهياً.
 */
export const RAG_REQUEST_LEASE_DURATION_MS = 5 * 60 * 1_000;

export const RAG_STALE_REQUEST_FAILURE_CODE = 'REQUEST_LEASE_EXPIRED';
