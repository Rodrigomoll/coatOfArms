// ─────────────────────────────────────────────────────────────────────────────
// MenuScreen.jsx — The Landing Page
//
// This is the FIRST thing users see. Its only job is to look impressive
// and get the user to click "Build Your Coat of Arms".
//
// It receives one prop:
//   onStart → a function that App.jsx gives us. When the button is clicked,
//              we call onStart() which switches the screen to the chat.
// ─────────────────────────────────────────────────────────────────────────────

export default function MenuScreen({ onStart }) {
  return (
    <div className="menu-screen">

      {/* ── Decorative corner ornaments ───────────────────────────────── */}
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="menu-content">

        {/* The large heraldic shield */}
        <div className="menu-shield-wrapper">
          <HeraldShield />
        </div>

        {/* Title */}
        <h1 className="menu-title">Career Coat of Arms</h1>

        {/* Decorative gold divider */}
        <div className="menu-divider">
          <span className="divider-line" />
          <span className="divider-diamond" />
          <span className="divider-line" />
        </div>

        {/* Subtitle */}
        <p className="menu-subtitle">
          Discover your professional identity through a guided 8-step interview.
          Your answers become a unique heraldic crest — a visual symbol of who you are.
        </p>

        {/* The 3-step "how it works" row */}
        <div className="menu-steps">
          <div className="menu-step">
            <span className="step-icon">✦</span>
            <span>8-Step Interview</span>
          </div>
          <div className="menu-step-divider" />
          <div className="menu-step">
            <span className="step-icon">✦</span>
            <span>AI Designs Your Crest</span>
          </div>
          <div className="menu-step-divider" />
          <div className="menu-step">
            <span className="step-icon">✦</span>
            <span>Download Your Art</span>
          </div>
        </div>

        {/* The main CTA button — this is the most important element */}
        <button className="menu-cta" onClick={onStart}>
          Build Your Coat of Arms
        </button>

        <p className="menu-footer">
          Ensign College · Career Services
        </p>

      </div>
    </div>
  );
}

// ── The large decorative shield SVG ─────────────────────────────────────────
// This is drawn with SVG paths — a proper heraldic shield shape
// divided into 6 sections with a crown on top
function HeraldShield() {
  return (
    <svg
      className="menu-shield-svg"
      viewBox="0 0 200 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield outline */}
      <path
        d="M100 8 L192 35 L192 120 C192 175 152 215 100 232 C48 215 8 175 8 120 L8 35 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* Inner shield border */}
      <path
        d="M100 20 L180 43 L180 120 C180 168 145 205 100 220 C55 205 20 168 20 120 L20 43 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />
      {/* Horizontal divider */}
      <line x1="20" y1="130" x2="180" y2="130" stroke="currentColor" strokeWidth="1.5" />
      {/* Vertical divider */}
      <line x1="100" y1="43" x2="100" y2="220" stroke="currentColor" strokeWidth="1.5" />
      {/* Horizontal mid-upper divider */}
      <line x1="20" y1="87" x2="180" y2="87" stroke="currentColor" strokeWidth="1" opacity="0.6"/>

      {/* Crown above shield */}
      <path
        d="M70 20 L80 6 L100 16 L120 6 L130 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Crown base */}
      <line x1="68" y1="20" x2="132" y2="20" stroke="currentColor" strokeWidth="2" />

      {/* Banner ribbon at bottom */}
      <path
        d="M30 225 Q100 238 170 225 L165 235 Q100 248 35 235 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.7"
      />

      {/* Small decorative dots in each section */}
      <circle cx="60" cy="65"  r="3" fill="currentColor" opacity="0.5" />
      <circle cx="140" cy="65"  r="3" fill="currentColor" opacity="0.5" />
      <circle cx="60" cy="108" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="140" cy="108" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="60" cy="160" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="140" cy="160" r="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
