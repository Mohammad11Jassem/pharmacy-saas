import { io } from "socket.io-client";

const token = process.env.TEST_ACCESS_TOKEN;

if (!token) {
  throw new Error("TEST_ACCESS_TOKEN is required.");
}

const socket = io(
  "http://127.0.0.1:3000/chatting",
  {
    auth: {
      token,
    },

    transports: [
      "polling",
      "websocket",
    ],

    reconnection: false,
    timeout: 10000,
  },
);

socket.on("connect", () => {
  console.log(
    "Socket connected:",
    socket.id,
  );
});

socket.on(
  "chat.connection.ready",
  (payload) => {
    console.log(
      "Chat socket ready:",
      JSON.stringify(payload, null, 2),
    );

    console.log(
      "Listening for chat events...",
    );
  },
);

socket.on(
  "chat.request.succeeded",
  (payload) => {
    console.log(
      "chat.request.succeeded:",
      JSON.stringify(payload, null, 2),
    );
  },
);

socket.on(
  "chat.request.failed",
  (payload) => {
    console.error(
      "chat.request.failed:",
      JSON.stringify(payload, null, 2),
    );
  },
);

socket.on(
  "connect_error",
  (error) => {
    console.error(
      "Socket connection failed:",
      error.message,
      error.data,
    );
  },
);

socket.on(
  "disconnect",
  (reason) => {
    console.log(
      "Socket disconnected:",
      reason,
    );
  },
);
