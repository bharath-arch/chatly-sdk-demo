# 💬 Chatly - Real-time Chat Application

A production-ready, fully functional real-time chat application built with **chatly-sdk@0.0.8-beta**, React, TypeScript, and WebSocket.

## ✨ Features

- ✅ User creation and authentication
- ✅ 1-to-1 real-time messaging
- ✅ End-to-end encrypted messages
- ✅ Auto-reconnection support
- ✅ Message timestamps
- ✅ Online/offline status
- ✅ Message delivery status

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation & Setup

1. **Start the WebSocket Server**

```bash
cd server
npm install
npm run dev
```

The server will start on `ws://localhost:8080`

2. **Start the React Client** (in a new terminal)

```bash
cd client
npm install
npm run dev
```

The client will be available at `http://localhost:5173`

## 📖 Usage

### Testing Real-Time Chat

1. Open http://localhost:5173 in **two different browser windows** (or use incognito mode for one)
2. **Window 1**: Create/login as "Alice"
3. **Window 2**: Create/login as "Bob"
4. **Window 1**: Select "Bob" from the user list
5. **Window 1**: Send a message - it will appear in Window 2 in real-time!
6. Exchange messages between both users

### Testing Message Persistence

1. Send several messages between users
2. Refresh the browser page
3. Login again - all messages will be restored from DB

### Testing Reconnection

1. With both users chatting, stop the server (Ctrl+C in server terminal)
2. Both clients will show "Reconnecting..." status
3. Restart the server: `node index.js`
4. Clients will automatically reconnect and resume chatting

## 🏗️ Architecture

```
chatly-app/
├── server/              # WebSocket server
│   ├── index.js        # Message routing and broadcasting
│   └── package.json
│
└── client/             # React frontend
    ├── src/
    │   ├── components/ # UI components
    │   ├── hooks/      # useChatSDK hook
    │   ├── stores/     # LocalStorageMessageStore
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

## 🔧 Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Chat SDK**: chatly-sdk@0.0.8-beta
- **Transport**: WebSocket (ws library)
- **Storage**: MongoDB
- **Styling**: Vanilla CSS with modern design

## 🎨 Features Breakdown

### Backend (WebSocket Server)
- Minimal Node.js server using `ws` library
- Client connection management
- Message routing between users
- Typing indicator broadcasting
- User status (online/offline) broadcasting
- Delivery confirmation

### Frontend (React App)

## 🔒 Security

Messages are end-to-end encrypted using the chatly-sdk encryption layer. The WebSocket server only routes encrypted messages and never has access to plaintext content.

## 📦 Production Deployment

For production use:

1. Deploy the WebSocket server to a cloud provider (AWS, Heroku, etc.)
2. Update the WebSocket URL in `client/src/hooks/useChatSDK.ts`
3. Build the React app: `npm run build`
4. Deploy the built files from `client/dist`
5. Use WSS (secure WebSocket) instead of WS
6. Consider using IndexedDB for larger message histories

## 🤝 Contributing

This is a demonstration project built with chatly-sdk@0.0.8-beta. Feel free to extend it with additional features!

## 📄 License

MIT
