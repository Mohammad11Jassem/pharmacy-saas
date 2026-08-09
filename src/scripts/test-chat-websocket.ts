import { randomUUID } from 'node:crypto';

import { io } from 'socket.io-client';

const backendBaseUrl = process.env.TEST_BACKEND_URL ?? 'http://127.0.0.1:3000';

const accessToken = process.env.TEST_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error('TEST_ACCESS_TOKEN is required.');
}

const socket = io(`${backendBaseUrl}/chatting`, {
  auth: {
    token: accessToken,
  },

  //   transports: ['websocket'],

  /*
   * اترك Socket.IO تختار polling ثم ترقي الاتصال
   * إلى WebSocket. هذا أفضل أثناء التشخيص.
   */
  transports: ['polling', 'websocket'],

  timeout: 10_000,
});

socket.on('connect', async () => {
  console.log(`Socket connected: ${socket.id}`);

  try {
    const response = await fetch(
      `${backendBaseUrl}/api/Chatting/conversations/start`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${accessToken}`,

          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          clientRequestId: randomUUID(),

          content: 'ما هي استخدامات وموانع استعمال دواء DOMPERON؟',
        }),
      },
    );

    const responseBody = await response.text();

    console.log(`REST status: ${response.status}`);

    console.log(`REST response: ${responseBody}`);
  } catch (error: unknown) {
    console.error('REST request failed:', error);

    socket.disconnect();
    process.exitCode = 1;
  }
});

socket.on('chat.connection.ready', (payload) => {
  console.log('Socket ready:', payload);
});

socket.on('chat.request.succeeded', (payload) => {
  console.log('Chat request succeeded:', JSON.stringify(payload, null, 2));

  socket.disconnect();
});

socket.on('chat.request.failed', (payload) => {
  console.error('Chat request failed:', JSON.stringify(payload, null, 2));

  socket.disconnect();
  process.exitCode = 1;
});

// socket.on(
//   'connect_error',
//   (error) => {
//     console.error(
//       'Socket connection failed:',
//       error.message,
//       error.data,
//     );

//     process.exitCode = 1;
//   },
// );

type SocketConnectionError = Error & {
  data?: unknown;
};

socket.on('connect_error', (error: Error) => {
  const socketError = error as SocketConnectionError;

  console.error(
    'Socket connection failed:',
    socketError.message,
    socketError.data,
  );

  process.exitCode = 1;
});

socket.on('disconnect', (reason) => {
  console.log(`Socket disconnected: ${reason}`);
});
