# 💬 Chatly - Real-time Chat Application

Fully functional real-time chat application built with **[chatly-sdk v2.0.0](https://github.com/bharath-arch/chatly-sdk/tree/2.0.0)** [![npm version](https://img.shields.io/npm/v/chatly-sdk.svg)](https://www.npmjs.com/package/chatly-sdk), React, TypeScript, and WebSocket.

## ✨ Features

- User creation and authentication
- 1-to-1 real-time messaging
- End-to-end encrypted messages
- Auto-reconnection with message queue and retry
- Message timestamps
- Online/offline status indicators
- Message delivery and read status
- Message persistence across sessions

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

### Installation & Setup

1. **Start the WebSocket Server**

   Open a terminal and run:

   ```bash
   cd server
   npm install
   npm run dev
   ```

   The server will run on `ws://localhost:8080`.

2. **Start the React Client**

   Open a new terminal and run:

   ```bash
   cd client
   npm install
   npm run dev
   ```

   The app will be available at `http://localhost:5173`.

## 📖 Usage

### Testing Real-Time Chat

1. Open `http://localhost:5173` in **two separate browser windows** (or use incognito for one).
2. In Window 1: Create or login as "Alice".
3. In Window 2: Create or login as "Bob".
4. In Window 1: Select "Bob" from the user list and send a message — it will appear instantly in Window 2.
5. Exchange messages to see real-time delivery, status updates, and online indicators.

### Testing Message Persistence

1. Send several messages between users.
2. Refresh or close the browser.
3. Login again — previous messages will load from the database.

### Testing Reconnection

1. While chatting, stop the server (Ctrl+C in the server terminal).
2. Clients will display "Reconnecting..." status.
3. Restart the server (`npm run dev`).
4. Clients will automatically reconnect, resume the session, and sync any queued messages.

## 🏗️ Architecture

```
chatly-app/
├── server/          # WebSocket server (Node.js + ws)
│   ├── index.js     # Connection handling, routing, broadcasting
│   └── package.json
│
└── client/          # React frontend
    ├── src/
    │   ├── components/   # UI components
    │   ├── hooks/        # useChatSDK custom hook
    │   ├── stores/       # Local storage adapters
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

## 🔧 Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Chat SDK**: [chatly-sdk@2.0.0](https://www.npmjs.com/package/chatly-sdk) (end-to-end encryption, event-driven)
- **Transport**: WebSocket (`ws` library)
- **Database**: MongoDB (for message persistence and user data)
- **Styling**: Vanilla CSS (modern, responsive design)

## 🔒 Security

All messages are **end-to-end encrypted** using the chatly-sdk's built-in layer (ECDH P-256 key exchange + AES-256-GCM). The server only routes encrypted payloads and cannot access plaintext content.

## 📦 Production Deployment

1. Deploy the WebSocket server to a cloud provider (e.g., AWS, Render, Heroku, Vercel).
2. Update the WebSocket URL in `client/src/hooks/useChatSDK.ts`.
3. Build the client: `cd client && npm run build`.
4. Serve the static files from `client/dist` (e.g., via Nginx, Vercel, Netlify).
5. Use **WSS** (secure WebSockets) in production with a valid SSL certificate.
6. Scale with load balancers and consider Redis for presence/status in larger deployments.
7. For extended history, switch to IndexedDB or a custom storage adapter.

## 🤝 Contributing

This project demonstrates the power of chatly-sdk v2.0.0. Feel free to fork, extend with group chats, media sharing, or other features, and submit pull requests!

## 📄 License

MIT
