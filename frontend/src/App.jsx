import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    const storedUser = sessionStorage.getItem('user');
    if (token && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        sessionStorage.clear();
      }
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {!currentUser ? (
        <Login onLoginSuccess={(user) => setCurrentUser(user)} />
      ) : (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
