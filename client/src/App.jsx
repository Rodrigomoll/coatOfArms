// ─────────────────────────────────────────────────────────────────────────────
// App.jsx — The Traffic Controller
//
// This component decides WHICH screen to show based on two things:
//   1. Is the token valid? (checked once on load)
//   2. Which screen is the user on? (menu or chat)
//
// The "screen" state works like a TV remote:
//   'menu' → show the landing page
//   'chat' → show the chat interface
//
// We pass functions DOWN to child components:
//   onStart → MenuScreen calls this when user clicks the CTA button
//   onBack  → ChatInterface calls this when user clicks "Back to Menu"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import MenuScreen from './components/MenuScreen';
import ChatInterface from './components/ChatInterface';

export default function App() {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  const [token, setToken] = useState('');
  const [screen, setScreen] = useState('menu'); // 'menu' | 'chat'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (!urlToken) {
      setAuthState('invalid');
      return;
    }

    setToken(urlToken);

    fetch('/api/validate-token', {
      headers: { 'x-access-token': urlToken },
    })
      .then((res) => {
        if (res.ok) setAuthState('valid');
        else setAuthState('invalid');
      })
      .catch(() => setAuthState('invalid'));
  }, []);

  // ── Still checking the token ──────────────────────────────────────────────
  if (authState === 'checking') {
    return (
      <div className="auth-screen">
        <div className="auth-spinner">
          <ShieldIcon />
          <p>Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────────────
  if (authState === 'invalid') {
    return (
      <div className="auth-screen">
        <div className="auth-denied">
          <ShieldIcon />
          <h1>Access Denied</h1>
          <p>You need a valid access link to use this application.</p>
          <p className="auth-hint">
            Contact the administrator to receive your personalized link.
          </p>
        </div>
      </div>
    );
  }

  // ── Valid token — show menu or chat ───────────────────────────────────────
  if (screen === 'menu') {
    return (
      <MenuScreen
        onStart={() => setScreen('chat')} // user clicked CTA → go to chat
      />
    );
  }

  return (
    <ChatInterface
      token={token}
      onBack={() => setScreen('menu')} // user clicked "Back to Menu" → go back
    />
  );
}

function ShieldIcon() {
  return (
    <svg className="auth-shield" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3 6V12C3 16.418 7.03 20.564 12 22C16.97 20.564 21 16.418 21 12V6L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
