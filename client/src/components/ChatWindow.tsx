import type { User, Message } from '../hooks/useChatSDK';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  currentUser: User;
  activeSession: any | null;
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  onDecryptMessage: (message: Message) => Promise<string>;
  onTyping: (isTyping: boolean) => void;
  typingUsers: Set<string>;
  onLogout: () => void;
}

export function ChatWindow({
  currentUser,
  activeSession,
  messages,
  onSendMessage,
  onDecryptMessage,
  onTyping,
  typingUsers,
  onLogout,
}: ChatWindowProps) {
  const getRecipientName = () => {
    if (!activeSession) return 'Select a user';
    
    const recipient = activeSession.participants.find(
      (p: User) => p.id !== currentUser.id
    );
    
    return recipient?.username || 'Unknown';
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="current-user">👤 {currentUser.username}</span>
        </div>
        <div className="chat-header-center">
          {activeSession ? (
            <h2>💬 Chat with {getRecipientName()}</h2>
          ) : (
            <h2>Select a user to start chatting</h2>
          )}
        </div>
        <div className="chat-header-right">
          <button onClick={onLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>

      {activeSession ? (
        <>
          <MessageList
            messages={messages}
            currentUser={currentUser}
            onDecrypt={onDecryptMessage}
            typingUsers={typingUsers}
          />
          <MessageInput
            onSendMessage={onSendMessage}
            onTyping={onTyping}
            disabled={false}
          />
        </>
      ) : (
        <div className="no-session">
          <p>👈 Select a user from the sidebar to start chatting</p>
        </div>
      )}
    </div>
  );
}
