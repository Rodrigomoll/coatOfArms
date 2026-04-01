// ─────────────────────────────────────────────────────────────────────────────
// ChatInterface.jsx — The Chat Screen
//
// New in this version:
//   1. LEFT PANEL — shows the 8 interview steps and which one is current
//      We detect the current step by counting user messages in chatHistory
//      (each user reply = one step answered)
//
//   2. COMPLETION STATE — when the server returns imageUrl, the interview
//      is done. We set isComplete=true which shows the thank you message
//      and the two action buttons.
//
//   3. onBack PROP — passed down from App.jsx. Calling it returns user
//      to the main menu.
//
//   4. Start Again — resets ALL state back to the initial values,
//      exactly as if the user just opened the chat for the first time.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import Message from './Message';

// The 8 interview steps — used to build the progress panel on the left
const STEPS = [
  { number: 1, label: 'Personality' },
  { number: 2, label: 'Family' },
  { number: 3, label: 'Hobbies & Interests' },
  { number: 4, label: 'Work Experience' },
  { number: 5, label: 'Accomplishments' },
  { number: 6, label: 'Education' },
  { number: 7, label: 'Core Values' },
  { number: 8, label: 'Artistic Style' },
];

const WELCOME_TEXT = `Welcome. I am your Heraldic Design Assistant. Together we will build your Career Coat of Arms — a visual symbol of your professional identity — through 8 steps. I will gather your information and stylistic preferences first before creating anything. Let us begin.

Step 1 of 8: Write five positive words that describe you.`;

// Returns a fresh initial state — used on mount AND when "Start Again" is clicked
function getInitialState() {
  return {
    chatHistory: [{ role: 'assistant', content: WELCOME_TEXT }],
    displayMessages: [{ id: 1, role: 'assistant', content: WELCOME_TEXT, imageUrl: null }],
  };
}

export default function ChatInterface({ token, onBack }) {
  const initial = getInitialState();
  const [chatHistory, setChatHistory] = useState(initial.chatHistory);
  const [displayMessages, setDisplayMessages] = useState(initial.displayMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false); // true after image is generated

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── How we know which step the user is on ──────────────────────────────────
  // Count how many times the USER has sent a message.
  // 0 messages = step 1 is current (not answered yet)
  // 1 message  = step 1 done, step 2 is current
  // 8 messages = all done
  const answeredCount = chatHistory.filter((m) => m.role === 'user').length;
  const currentStep = Math.min(answeredCount + 1, 8);

  // ── Reset everything — used by "Start Again" button ───────────────────────
  const handleStartAgain = () => {
    const fresh = getInitialState();
    setChatHistory(fresh.chatHistory);
    setDisplayMessages(fresh.displayMessages);
    setInput('');
    setIsLoading(false);
    setError(null);
    setIsComplete(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Send a message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const userText = input.trim();
    if (!userText || isLoading || isComplete) return;

    setInput('');
    setError(null);

    // Show user message immediately
    setDisplayMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', content: userText },
    ]);

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({ messages: chatHistory, userMessage: userText }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await response.json();
      // data = { message: "...", imageUrl: "..." (only when DRAW was typed) }

      // Add AI response to display
      setDisplayMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message,
          imageUrl: data.imageUrl || null,
        },
      ]);

      // Update conversation history
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: userText },
        { role: 'assistant', content: data.message },
      ]);

      // If the server returned an image → interview is complete
      if (data.imageUrl) {
        setIsComplete(true);
      }

    } catch (err) {
      setError(err.message || 'The scribe encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-layout">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="app-header">
        <button className="back-button" onClick={onBack} title="Back to Menu">
          ← Menu
        </button>
        <div className="header-center">
          <h1>Career Coat of Arms</h1>
          <p>Guided Heraldic Design Assistant</p>
        </div>
        <div className="header-right">
          {isComplete
            ? <span className="header-badge complete">✦ Complete</span>
            : <span className="header-badge">Step {currentStep} of 8</span>
          }
        </div>
      </header>

      {/* ── BODY (sidebar + chat) ───────────────────────────────────────── */}
      <div className="body-layout">

        {/* LEFT PANEL — interview progress ────────────────────────────── */}
        <aside className="progress-panel">
          <p className="progress-title">Your Interview</p>

          <div className="steps-list">
            {STEPS.map((step) => {
              const isDone    = step.number < currentStep || isComplete;
              const isCurrent = step.number === currentStep && !isComplete;

              return (
                <div
                  key={step.number}
                  className={`step-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <div className="step-dot">
                    {isDone ? '✓' : step.number}
                  </div>
                  <span className="step-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Show completion actions in the sidebar too */}
          {isComplete && (
            <div className="sidebar-actions">
              <button className="sidebar-btn primary" onClick={handleStartAgain}>
                Start Again
              </button>
              <button className="sidebar-btn secondary" onClick={onBack}>
                Back to Menu
              </button>
            </div>
          )}
        </aside>

        {/* CHAT AREA ───────────────────────────────────────────────────── */}
        <div className="chat-column">
          <main className="chat-area">
            <div className="messages-container">
              {displayMessages.map((msg) => (
                <Message key={msg.id} message={msg} />
              ))}

              {/* Loading dots */}
              {isLoading && (
                <div className="message-row assistant">
                  <div className="avatar"><SmallShield /></div>
                  <div className="bubble bubble-assistant loading-bubble">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="error-banner">
                  <span>⚠</span> {error}
                </div>
              )}

              {/* ── COMPLETION CARD ─────────────────────────────────────── */}
              {/* Shown below the generated image once the interview is done */}
              {isComplete && (
                <div className="completion-card">
                  <div className="completion-divider">
                    <span />
                    <span className="completion-star">✦</span>
                    <span />
                  </div>
                  <h2 className="completion-title">Your Crest Has Been Forged</h2>
                  <p className="completion-text">
                    Your Career Coat of Arms is a reflection of your unique identity,
                    values, and journey. Carry it with pride.
                  </p>
                  <div className="completion-buttons">
                    <button className="completion-btn primary" onClick={handleStartAgain}>
                      ↺ Start Again
                    </button>
                    <button className="completion-btn secondary" onClick={onBack}>
                      ← Back to Menu
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </main>

          {/* INPUT AREA — hidden after completion ───────────────────────── */}
          {!isComplete && (
            <footer className="input-area">
              <div className="input-container">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write your answer here... (Enter to send)"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                >
                  <SendIcon />
                </button>
              </div>
              <p className="input-hint">
                Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
              </p>
            </footer>
          )}
        </div>

      </div>
    </div>
  );
}

function SmallShield() {
  return (
    <svg viewBox="0 0 24 28" fill="none" width="16" height="16">
      <path d="M12 1L23 5V14C23 20 18 25 12 27C6 25 1 20 1 14V5Z"
        stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
      <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
