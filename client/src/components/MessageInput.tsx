import { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
  onSendMedia: (file: File) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onSendMedia, onTyping, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || sending) return;

    setSending(true);
    
    try {
      await onSendMessage(message.trim());
      setMessage('');
      onTyping(false); // Stop typing indicator
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;

    setSending(true);
    try {
      await onSendMedia(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to send file:', error);
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Send typing indicator
    onTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 1 second of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="message-input">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="file-upload"
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
      />
      <label htmlFor="file-upload" className="btn-icon">
        📎
      </label>
      <input
        type="text"
        value={message}
        onChange={handleChange}
        placeholder="Type a message..."
        disabled={disabled || sending}
        autoFocus
      />
      <button
        type="submit"
        disabled={!message.trim() || disabled || sending}
        className="btn-send"
      >
        {sending ? '⏳' : '📤'}
      </button>
    </form>
  );
}
