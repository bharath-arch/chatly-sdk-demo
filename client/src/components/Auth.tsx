import { useState } from 'react';
import type { User } from '../hooks/useChatSDK';

interface AuthProps {
  onLogin: (username: string) => Promise<User>;
  users: User[];
  onGetUsers: () => Promise<User[]>;
}

export function Auth({ onLogin, users, onGetUsers }: AuthProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onLogin(username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: User) => {
    setLoading(true);
    setError('');

    try {
      await onLogin(user.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshUsers = async () => {
    setLoading(true);
    try {
      await onGetUsers();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>💬 Chatly</h1>
          <p>Real-time encrypted chat</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Create / Login'}
          </button>
        </form>

        {users.length > 0 && (
          <div className="existing-users">
            <div className="users-header">
              <h3>Existing Users</h3>
              <button
                onClick={handleRefreshUsers}
                className="btn-refresh"
                disabled={loading}
              >
                🔄
              </button>
            </div>
            <div className="users-list">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleQuickLogin(user)}
                  className="user-item"
                  disabled={loading}
                >
                  <span className="user-avatar">👤</span>
                  <span className="user-name">{user.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
