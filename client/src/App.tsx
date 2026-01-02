import { useEffect } from 'react';
import { useChatSDK } from './hooks/useChatSDK';
import { Auth } from './components/Auth';
import { ChatWindow } from './components/ChatWindow';
import { UserStatus } from './components/UserStatus';
import type { User } from './hooks/useChatSDK';

function App() {
  const {
    currentUser,
    connectionState,
    messages,
    users,
    activeSession,
    typingUsers,
    userStatuses,
    loginUser,
    startSession,
    sendMessage,
    sendTypingIndicator,
    getAllUsers,
    findUserByUsername,
  } = useChatSDK();



  console.log(users, 'getAllUsers')

  // Load users on mount
  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  const handleLogin = async (username: string) => {
    const user = await loginUser(username);
    if (user) {
      // Refresh user list after login
      await getAllUsers();
    }
    return user;
  };

  const handleSelectUser = async (user: User) => {
    await startSession(user);
  };

  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
  };

  const handleDecryptMessage = async (message: any) => {
    // With SDK moved to BE, we assume messages are decrypted before arrival 
    // or handled by the simplified SDK hook logic.
    return message.ciphertext || '';
  };

  const handleLogout = () => {
    // Clear persisted user
    localStorage.removeItem('chatly_user');
    // Reload the page to reset state
    window.location.reload();
  };

  if (!currentUser) {
    return <Auth onLogin={handleLogin} users={users} onGetUsers={getAllUsers} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <UserStatus
          users={users}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          userStatuses={userStatuses}
          connectionState={connectionState}
          onSearchUser={findUserByUsername}
        />
      </aside>
      <main className="main-content">
        <ChatWindow
          currentUser={currentUser}
          activeSession={activeSession}
          messages={messages}
          onSendMessage={handleSendMessage}
          onDecryptMessage={handleDecryptMessage}
          onTyping={sendTypingIndicator}
          typingUsers={typingUsers}
          onLogout={handleLogout}
        />
      </main>
    </div>
  );
}

export default App;
