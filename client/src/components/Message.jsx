// ─────────────────────────────────────────────────────────────────────────────
// Message.jsx — Renders a single chat message bubble
//
// Handles:
//   - User messages (right-aligned, blue-purple)
//   - Assistant messages (left-aligned, gold accent border, shield avatar)
//   - Image display — shows the generated coat of arms with a decorative frame
//   - Newlines in text are preserved
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

export default function Message({ message }) {
  const { role, content, imageUrl } = message;
  const isAssistant = role === 'assistant';

  return (
    <div className={`message-row ${isAssistant ? 'assistant' : 'user'}`}>
      {/* Shield avatar — only on assistant messages */}
      {isAssistant && (
        <div className="avatar">
          <svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 1L23 5V14C23 20 18 25 12 27C6 25 1 20 1 14V5Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      <div className={`bubble ${isAssistant ? 'bubble-assistant' : 'bubble-user'}`}>
        {/* Render the text, preserving line breaks */}
        <MessageText text={content} />

        {/* If this message has a generated image, show it below the text */}
        {imageUrl && <CoatOfArmsImage src={imageUrl} />}
      </div>
    </div>
  );
}

// Converts \n line breaks to <br> elements so they render correctly
function MessageText({ text }) {
  const lines = text.split('\n');
  return (
    <div className="message-text">
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

// The generated coat of arms image with a decorative golden frame
function CoatOfArmsImage({ src }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="image-error">
        The image could not be displayed. The crest has been forged — try right-clicking the link to save it.
      </div>
    );
  }

  return (
    <div className="coat-image-wrapper">
      <div className="coat-image-frame">
        <p className="coat-image-label">Your Career Coat of Arms</p>
        {!loaded && (
          <div className="image-loading">
            <div className="image-spinner" />
            <p>Forging your crest...</p>
          </div>
        )}
        <img
          src={src}
          alt="Your Career Coat of Arms"
          className="coat-image"
          style={{ display: loaded ? 'block' : 'none' }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
        {loaded && (
          <a
            href={src}
            download="coat-of-arms.png"
            className="download-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↓ Download Your Crest
          </a>
        )}
      </div>
    </div>
  );
}
