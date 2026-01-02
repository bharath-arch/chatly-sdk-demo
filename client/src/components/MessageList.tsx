import { useEffect, useRef } from 'react';
import type { User, Message } from '../hooks/useChatSDK';

interface MessageListProps {
  messages: Message[];
  currentUser: User | null;
  typingUsers: Set<string>;
  onDecrypt?: any;
}

export function MessageList({ messages, currentUser, typingUsers, onDecrypt }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message) => {
          const isOwnMessage = message.senderId === currentUser?.id;
          
          return (
            <MessageItem
              key={message.id}
              message={message}
              isOwnMessage={isOwnMessage}
            />
          );
        })
      )}

      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          <span className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="typing-text">typing...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // With SDK on BE, we prefer message.text (plaintext)
    setDecryptedText(message.text || message.ciphertext || '');
    setLoading(false);
  }, [message]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}>
      <div className="message-bubble">
        {loading ? (
          <span className="message-loading">Decrypting...</span>
        ) : (
          <div className="message-content">
            {message.type === 'media' && message.media ? (
              <div className="media-message">
                {message.media.type === 'image' ? (
                  <img src={message.media.data} alt={message.media.metadata?.name} className="chat-image" />
                ) : (
                  <div className="file-attachment">
                    <span>📄 {message.media.metadata?.name}</span>
                    <a href={message.media.data} download={message.media.metadata?.name} className="btn-download">
                      Download
                    </a>
                  </div>
                )}
                {message.text && <p className="media-caption">{message.text}</p>}
              </div>
            ) : (
              <p className="message-text">{decryptedText}</p>
            )}
          </div>
        )}
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {isOwnMessage && (
            <span className="message-status">
              {message.status === 'sent' ? '✓' : '✓✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Add this import at the top
import { useState } from 'react';
