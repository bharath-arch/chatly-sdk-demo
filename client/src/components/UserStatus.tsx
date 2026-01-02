import { useState } from 'react';
import type { User } from '../hooks/useChatSDK';

interface UserStatusProps {
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  userStatuses: Map<string, 'online' | 'offline'>;
  connectionState: any; // Using any for now to avoid enum mismatch issues if I missed any
  onSearchUser?: (username: string) => Promise<User | null>;
}

export function UserStatus({
  users,
  currentUser,
  onSelectUser,
  userStatuses,
  connectionState,
  onSearchUser,
}: UserStatusProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return '🟢 Connected';
      case 'CONNECTING':
        return '🟡 Connecting...';
      case 'DISCONNECTED':
        return '🔴 Disconnected';
      case 'ERROR':
        return '💥 Connection Failed';
      default:
        return '⚪ Unknown';
    }
  };

  console.log(users,'users')

  const availableUsers = users.filter((u) => u.id !== currentUser?.id);
  
  const filteredUsers = availableUsers.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!onSearchUser || !searchTerm.trim()) return;

    setSearching(true);
    setSearchError('');
    try {
      const user = await onSearchUser(searchTerm.trim());
      if (user) {
        onSelectUser(user);
        setSearchTerm('');
      } else {
        setSearchError('User not found');
      }
    } catch (err) {
      setSearchError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="user-status">
      <div className="connection-status">
        <span>{getConnectionStatusText()}</span>
      </div>

      <div className="user-search">
        <input
          type="text"
          placeholder="Search or add user..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSearchError('');
          }}
          className="search-input"
        />
        {searchTerm && filteredUsers.length === 0 && (
          <div className="search-actions">
            {searching ? (
              <span className="searching-text">Searching...</span>
            ) : (
              <button onClick={handleAddUser} className="btn-add-user">
                🔍 Find & Add "{searchTerm}"
              </button>
            )}
            {searchError && <p className="search-error">{searchError}</p>}
          </div>
        )}
      </div>

      <div className="user-list">
        <h3>Available Users</h3>
        {availableUsers.length === 0 && !searchTerm ? (
          <p className="no-users">No other users online</p>
        ) : filteredUsers.length === 0 && searchTerm ? (
          <p className="no-users">No contacts matching "{searchTerm}"</p>
        ) : (
          filteredUsers.map((user) => {
            const status = userStatuses.get(user.id) || 'offline';
            
            return (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="user-list-item"
              >
                <span className="user-avatar">👤</span>
                <div className="user-info">
                  <span className="user-name">{user.username}</span>
                  <span className={`user-status-badge ${status}`}>
                    {status === 'online' ? '🟢' : '⚪'} {status}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
