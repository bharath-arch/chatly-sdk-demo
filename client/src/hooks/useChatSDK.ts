import { useState, useEffect, useCallback, useRef } from 'react';

// Simplified types to replace SDK ones
export interface User {
  id: string;
  username: string;
  publicKey: any;
  status?: 'online' | 'offline';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  ciphertext: string;
  iv: string;
  type: string;
  timestamp: number;
  text?: string;
  status?: 'sent' | 'delivered' | 'pending';
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface ChatSDKState {
  currentUser: User | null;
  connectionState: ConnectionState;
  messages: Message[];
  users: User[];
  activeSession: any | null; // Just a session object now
  typingUsers: Set<string>;
  userStatuses: Map<string, 'online' | 'offline'>;
}

export function useChatSDK() {
  const [state, setState] = useState<ChatSDKState>({
    currentUser: null,
    connectionState: ConnectionState.DISCONNECTED,
    messages: [],
    users: [],
    activeSession: null,
    typingUsers: new Set(),
    userStatuses: new Map(),
  });

  const socketRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket
  const connect = useCallback((userId: string) => {
    if (socketRef.current) socketRef.current.close();

    console.log('🔌 Connecting to server...');
    setState(prev => ({ ...prev, connectionState: ConnectionState.CONNECTING }));

    const ws = new WebSocket(`ws://localhost:8080?userId=${userId}`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connected to WebSocket');
      setState(prev => ({ ...prev, connectionState: ConnectionState.CONNECTED }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'all_users':
          setState(prev => ({ ...prev, users: data.users }));
          break;
        case 'user_status':
          setState(prev => {
            const userStatuses = new Map(prev.userStatuses);
            userStatuses.set(data.userId, data.status);
            
            let nextUsers = prev.users;
            if (data.user) {
              const exists = prev.users.find(u => u.id === data.user.id);
              if (!exists) nextUsers = [...prev.users, data.user];
            }
            return { ...prev, userStatuses, users: nextUsers };
          });
          break;
        case 'message':
          setState(prev => ({ ...prev, messages: [...prev.messages, data.message] }));
          break;
        case 'history':
          setState(prev => ({ ...prev, messages: data.messages }));
          break;
        case 'typing':
          setState(prev => {
            const typingUsers = new Set(prev.typingUsers);
            if (data.isTyping) typingUsers.add(data.senderId);
            else typingUsers.delete(data.senderId);
            return { ...prev, typingUsers };
          });
          break;
      }
    };

    ws.onclose = () => {
      console.log('🔌 Disconnected from WebSocket');
      setState(prev => ({ ...prev, connectionState: ConnectionState.DISCONNECTED }));
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      setState(prev => ({ ...prev, connectionState: ConnectionState.ERROR }));
    };

    return ws;
  }, []);

  // Restore user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('chatly_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setState(prev => ({ ...prev, currentUser: user }));
        connect(user.id);
      } catch (err) {
        console.error('Failed to restore user:', err);
        localStorage.removeItem('chatly_user');
      }
    }
  }, [connect]);

  // Login User
  const loginUser = useCallback(async (username: string) => {
    const tempUserId = `temp-${Date.now()}`;
    const ws = connect(tempUserId);

    return new Promise<User>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.removeEventListener('message', handleLoginResponse);
        ws.removeEventListener('error', handleError);
        ws.removeEventListener('close', handleClose);
        reject(new Error('Login timed out. Please try again.'));
      }, 10000);

      const handleLoginResponse = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'login_success') {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleLoginResponse);
            ws.removeEventListener('error', handleError);
            ws.removeEventListener('close', handleClose);
            
            // Persist user
            localStorage.setItem('chatly_user', JSON.stringify(data.user));
            
            // Connect to real session
            connect(data.user.id);
            setState(prev => ({ ...prev, currentUser: data.user }));
            resolve(data.user);
          } else if (data.type === 'error') {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleLoginResponse);
            ws.removeEventListener('error', handleError);
            ws.removeEventListener('close', handleClose);
            reject(new Error(data.message));
          }
        } catch (err) {
          console.error('Error parsing login response:', err);
        }
      };

      const handleError = (err: any) => {
        clearTimeout(timeout);
        ws.removeEventListener('message', handleLoginResponse);
        ws.removeEventListener('error', handleError);
        ws.removeEventListener('close', handleClose);
        reject(new Error('Connection error during login'));
      };

      const handleClose = () => {
        clearTimeout(timeout);
        ws.removeEventListener('message', handleLoginResponse);
        ws.removeEventListener('error', handleError);
        ws.removeEventListener('close', handleClose);
        reject(new Error('Connection closed during login'));
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'login', username }));
      } else {
        ws.addEventListener('open', () => {
          ws.send(JSON.stringify({ type: 'login', username }));
        }, { once: true });
      }

      ws.addEventListener('message', handleLoginResponse);
      ws.addEventListener('error', handleError);
      ws.addEventListener('close', handleClose);
    });
  }, [connect]);

  // Start Session
  const startSession = useCallback(async (otherUser: User) => {
    if (!state.currentUser || !socketRef.current) return;

    const session = {
      id: [state.currentUser.id, otherUser.id].sort().join('-'),
      participants: [state.currentUser, otherUser]
    };

    setState(prev => ({ ...prev, activeSession: session }));

    // Request history
    socketRef.current.send(JSON.stringify({
      type: 'get_history',
      otherUserId: otherUser.id
    }));

    return session;
  }, [state.currentUser]);

  // Send Message
  const sendMessage = useCallback(async (text: string) => {
    if (!state.activeSession || !socketRef.current) return;

    socketRef.current.send(JSON.stringify({
      type: 'send_message',
      session: state.activeSession,
      text
    }));
  }, [state.activeSession]);

  // Send Typing Indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!state.activeSession || !state.currentUser || !socketRef.current) return;

    const otherUser = state.activeSession.participants.find((p: any) => p.id !== state.currentUser?.id);
    if (!otherUser) return;

    socketRef.current.send(JSON.stringify({
      type: 'typing',
      receiverId: otherUser.id,
      isTyping
    }));
  }, [state.activeSession, state.currentUser]);

  // Get All Users (Already handled by WebSocket auto-sync, but for API compatibility)
  const getAllUsers = useCallback(async () => {
    return state.users;
  }, [state.users]);

  // Find User by Username
  const findUserByUsername = useCallback(async (username: string) => {
    return state.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }, [state.users]);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return {
    ...state,
    loginUser,
    startSession,
    sendMessage,
    sendTypingIndicator,
    getAllUsers,
    findUserByUsername,
  };
}
