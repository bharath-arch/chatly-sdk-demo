import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import { 
  ChatSDK, 
  ChatSession,
  InMemoryGroupStore,
  validateUsername,
  validateUserId
} from 'chatly-sdk';

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatly';
console.log(`🔌 Connecting to MongoDB at ${MONGODB_URI}...`);
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('📦 Connected to MongoDB successfully');
    startServer();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// --- Mongoose Models ---

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  publicKey: { type: Object, required: true },
  identityKey: { type: Object },
  privateKey: { type: Object },
  lastSeen: { type: Date, default: Date.now },
  status: { type: String, default: 'offline' }
});
const UserModel = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  senderId: { type: String, required: true },
  receiverId: { type: String },
  groupId: { type: String },
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  media: { type: Object }, // Added media field to persist encrypted media data/metadata
  type: { type: String, required: true },
  timestamp: { type: Date, required: true }
});
const MessageModel = mongoose.model('Message', messageSchema);

// --- Custom ChatSDK Stores ---

class MongoDBUserStore {
  async create(user) {
    return this.save(user);
  }
  async save(user) {
    try {
      console.log(`💾 Saving user: ${user.username} (${user.id})`);
      await UserModel.findOneAndUpdate({ id: user.id }, user, { upsert: true });
      return user;
    } catch (err) {
      console.error(`❌ MongoDBUserStore.save error:`, err.message);
      throw err;
    }
  }
  async findById(id) {
    return await UserModel.findOne({ id });
  }
  async list() {
    return await UserModel.find({});
  }
  async delete(id) {
    await UserModel.deleteOne({ id });
  }
}

class MongoDBMessageStore {
  async create(message) {
    try {
      await MessageModel.create(message);
      return message;
    } catch (err) {
      console.error(`❌ MongoDBMessageStore.create error:`, err.message);
      throw err;
    }
  }
  async listByUser(userId) {
    return await MessageModel.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ timestamp: 1 });
  }
  async listByGroup(groupId) {
    return await MessageModel.find({ groupId }).sort({ timestamp: 1 });
  }
}

// --- Initialize ChatSDK ---

const sdk = new ChatSDK({
  userStore: new MongoDBUserStore(),
  messageStore: new MongoDBMessageStore(),
  groupStore: new InMemoryGroupStore(),
  transport: { 
    connect: async () => {}, 
    disconnect: async () => {},
    send: async () => {},
    onMessage: () => {},
    onConnectionStateChanged: () => {},
    onError: () => {}
  } 
});

// --- WebSocket Server ---

let wss;
const clients = new Map();

async function startServer() {
  wss = new WebSocketServer({ port: 8080 });

  console.log('🚀 WebSocket server running on ws://localhost:8080');

  wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'ws://localhost:8080');
  const userId = url.searchParams.get('userId');

  if (!userId) {
    ws.close(4001, 'Missing userId');
    return;
  }

  clients.set(userId, ws);
  console.log(`✅ User ${userId} connected`);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

      // Login/Registration
      if (message.type === 'login') {
        const { username } = message;
        try {
          validateUsername(username);
          const users = await sdk.listUsers();
          let user = users.find(u => u.username === username);
          
          if (!user) {
            user = await sdk.createUser(username);
            console.log(`👤 Created user: ${username}`);
          } else {
            console.log(`👤 Logged in user: ${username}`);
          }
          
          ws.send(JSON.stringify({ type: 'login_success', user }));
          broadcastUserStatus(user.id, 'online', user);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
        return;
      }

      // Sending messages
      if (message.type === 'send_message') {
        const { session, text } = message;
        console.log(`✉️ Sending message from ${userId}: "${text}"`);
        try {
          const sender = await sdk.getUserById(userId);
          const recipientId = session.participants.find(p => p.id !== userId)?.id;
          const recipient = await sdk.getUserById(recipientId);

          if (!sender || !recipient) {
            console.error('❌ Sender or recipient not found', { userId, recipientId });
            throw new Error('Sender or recipient not found');
          }

          if (!sender.privateKey) {
            console.error('❌ Sender missing privateKey!', sender.username);
            throw new Error('Server error: encryption keys missing for sender');
          }

          // In this architecture, we use ChatSession on the server 
          // to encrypt the message using the server-held keys.
          const chatSession = new ChatSession(session.id, sender, recipient);
          const msg = await chatSession.encrypt(text, userId);
          
          // Save to store
          await sdk.config.messageStore.create(msg);
          
          // For the lightweight client, we attach the plaintext as 'text'
          const msgToClient = { ...msg, text };

          // Relay to recipient(s)
          if (recipientId) {
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({ type: 'message', message: msgToClient }));
              
              // Delivery conf
              ws.send(JSON.stringify({ type: 'delivery', messageId: msg.id, status: 'delivered' }));
            } else {
              ws.send(JSON.stringify({ type: 'delivery', messageId: msg.id, status: 'pending' }));
            }
          }
          
          // Send back to sender for UI update
          ws.send(JSON.stringify({ type: 'message', message: msgToClient }));
        } catch (err) {
          console.error('❌ Send error:', err.message);
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
        return;
      }

      // Sending media
      if (message.type === 'send_media') {
        const { session, caption, media } = message;
        console.log(`🖼️ Sending media from ${userId}: ${media.metadata.name}`);
        try {
          const sender = await sdk.getUserById(userId);
          const recipientId = session.participants.find(p => p.id !== userId)?.id;
          const recipient = await sdk.getUserById(recipientId);

          if (!sender || !recipient) {
            throw new Error('Sender or recipient not found');
          }

          const chatSession = new ChatSession(session.id, sender, recipient);
          
          // Encrypt media message manually on server
          const msg = await chatSession.encryptMedia(caption || '', {
            type: media.type,
            data: media.data,
            metadata: media.metadata
          }, userId);
          
          await sdk.config.messageStore.create(msg);
          
          // For client, we send media in plaintext (it's already been decrypted/handled by hook logic)
          const msgToClient = { ...msg, text: caption, media: { ...msg.media, data: media.data } };

          if (recipientId) {
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({ type: 'message', message: msgToClient }));
              ws.send(JSON.stringify({ type: 'delivery', messageId: msg.id, status: 'delivered' }));
            }
          }
          ws.send(JSON.stringify({ type: 'message', message: msgToClient }));
        } catch (err) {
          console.error('❌ Media error:', err.message);
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
        return;
      }

      // History
      if (message.type === 'get_history') {
        const { otherUserId } = message;
        try {
          const sender = await sdk.getUserById(userId);
          const recipient = await sdk.getUserById(otherUserId);
          
          if (!sender || !recipient) {
            console.error('❌ History error: Sender or recipient not found');
            return;
          }

          const history = await MessageModel.find({
            $or: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId }
            ]
          }).sort({ timestamp: 1 });
          
          // Reconstruct session for decryption
          const sessionId = [userId, otherUserId].sort().join('-');
          // Convert Mongoose docs to plain objects for the SDK
          const senderObj = sender.toObject();
          const recipientObj = recipient.toObject();
          
          const historyWithText = [];
          
          // Decrypt messages sequentially for the client to avoid state corruption
          for (const msg of history) {
            try {
              const chatSession = new ChatSession(sessionId, senderObj, recipientObj);
              await chatSession.initialize(); 

              if (msg.type === 'media') {
                const decryptedMedia = await chatSession.decryptMedia(msg, senderObj);
                historyWithText.push({
                  ...msg.toObject(),
                  text: decryptedMedia.text,
                  media: decryptedMedia.media
                });
                continue;
              }

              const decrypted = await chatSession.decrypt(msg, senderObj);
              historyWithText.push({
                ...msg.toObject(),
                text: decrypted
              });
            } catch (err) {
              console.error(`❌ Decryption error for message ${msg.id}:`, err.message);
              historyWithText.push({
                ...msg.toObject(),
                text: '[Decryption Error]'
              });
            }
          }
          
          ws.send(JSON.stringify({ type: 'history', messages: historyWithText }));
        } catch (err) {
          console.error('❌ History fetch error:', err.message);
        }
        return;
      }

      // Typing
      if (message.type === 'typing') {
        const { receiverId, isTyping } = message;
        const recipientWs = clients.get(receiverId);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({ type: 'typing', senderId: userId, isTyping }));
        }
        return;
      }

    } catch (err) {
      console.error('❌ Message error:', err.message);
    }
  });

  // Background status update and initial data
  (async () => {
    try {
      if (!userId.startsWith('temp-')) {
        await UserModel.findOneAndUpdate({ id: userId }, { status: 'online', lastSeen: new Date() });
        broadcastUserStatus(userId, 'online');
      }
      
      const users = await sdk.listUsers();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'all_users', users }));
      }
    } catch (err) {
      console.error('❌ Error in initial connection setup:', err.message);
    }
  })();

  ws.on('close', async () => {
    clients.delete(userId);
    console.log(`👋 User ${userId} disconnected`);
    await UserModel.findOneAndUpdate({ id: userId }, { status: 'offline', lastSeen: new Date() });
    broadcastUserStatus(userId, 'offline');
  });
  });
}

function broadcastUserStatus(userId, status, userData = null) {
  const statusMessage = JSON.stringify({
    type: 'user_status',
    userId,
    status,
    user: userData,
    timestamp: Date.now()
  });

  clients.forEach((clientWs, clientId) => {
    if (clientId !== userId && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(statusMessage);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  clients.forEach((ws) => ws.close(1000, 'Server shutting down'));
  await mongoose.connection.close();
  if (wss) {
    wss.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
