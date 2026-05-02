export default function Lucas() {
  return (
    <>
      <style>{`
        .lc-hero {
          min-height: 100dvh;
          background: #050a14;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          position: relative;
          overflow: hidden;
        }
        .lc-stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 10% 15%, rgba(180,210,240,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 40%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(1.2px 1.2px at 40% 10%, rgba(180,210,240,0.7) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 55% 30%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 20%, rgba(180,210,240,0.6) 0%, transparent 100%),
            radial-gradient(0.9px 0.9px at 80% 50%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 10%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(0.7px 0.7px at 15% 70%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 60%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 60% 75%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1.1px 1.1px at 75% 65%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(0.9px 0.9px at 88% 80%, rgba(180,210,240,0.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 5% 85%, rgba(180,210,240,0.4) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 48% 88%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 92% 45%, rgba(180,210,240,0.5) 0%, transparent 100%),
            radial-gradient(0.7px 0.7px at 20% 55%, rgba(180,210,240,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 65% 5%, rgba(180,210,240,0.6) 0%, transparent 100%),
            radial-gradient(0.9px 0.9px at 82% 28%, rgba(180,210,240,0.45) 0%, transparent 100%),
            radial-gradient(1.2px 1.2px at 50% 50%, rgba(180,210,240,0.25) 0%, transparent 100%),
            radial-gradient(0.8px 0.8px at 30% 22%, rgba(180,210,240,0.5) 0%, transparent 100%);
          pointer-events: none;
        }
        .lc-title {
          font-size: 0.75rem;
          color: #7ea3c4;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 1rem;
          position: relative;
        }
        .lc-name {
          font-size: clamp(2.5rem, 8vw, 4.5rem);
          font-weight: 300;
          color: #ffffff;
          letter-spacing: -0.04em;
          line-height: 1;
          text-align: center;
          position: relative;
        }
        .lc-divider {
          width: 40px;
          height: 1px;
          background: #1a3a5c;
          margin: 2rem auto;
          position: relative;
        }
        .lc-rocket {
          width: 100%;
          max-width: 480px;
          position: relative;
          margin: 0 auto;
        }
        .lc-rocket svg {
          width: 100%;
          border-radius: 12px;
          display: block;
        }
        .lc-caption {
          font-size: 0.7rem;
          color: #2a4a6a;
          text-align: center;
          margin-top: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          position: relative;
        }
        .lc-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0a1f38;
          border: 0.5px solid #1a3a5c;
          border-radius: 999px;
          padding: 6px 18px;
          margin-top: 2rem;
          position: relative;
        }
        .lc-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #378ADD;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .lc-badge-text {
          font-size: 0.75rem;
          color: #7ea3c4;
          letter-spacing: 0.06em;
        }
      `}</style>

      <main className="lc-hero">
        <div className="lc-stars" />

        <p className="lc-title">Ingeniero · Starship · SpaceX</p>
        <h1 className="lc-name">Lucas Crespo</h1>

        <div className="lc-divider" />

        <div className="lc-rocket">
          <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">
            <rect width="480" height="300" fill="#060d1a" rx="12"/>

            {/* Atmosphere glow at base */}
            <ellipse cx="240" cy="285" rx="200" ry="12" fill="#0a1f38" opacity="0.8"/>

            {/* Exhaust plume */}
            <ellipse cx="240" cy="270" rx="32" ry="14" fill="#0c1e30" opacity="0.9"/>
            <ellipse cx="240" cy="264" rx="20" ry="18" fill="#0e2540"/>
            <ellipse cx="240" cy="260" rx="12" ry="14" fill="#185FA5" opacity="0.9"/>
            <ellipse cx="240" cy="256" rx="7" ry="10" fill="#378ADD" opacity="0.95"/>
            <ellipse cx="240" cy="253" rx="4" ry="6" fill="#85B7EB"/>
            <ellipse cx="240" cy="251" rx="2" ry="3" fill="#B5D4F4"/>

            {/* Ground */}
            <rect x="0" y="278" width="480" height="22" fill="#08111c"/>
            <rect x="0" y="276" width="480" height="3" fill="#0d1e2e"/>

            {/* Raptor engines */}
            <rect x="200" y="268" width="80" height="12" rx="2" fill="#0a1520"/>
            <rect x="208" y="265" width="10" height="8" rx="1.5" fill="#0d1f30"/>
            <rect x="235" y="265" width="10" height="8" rx="1.5" fill="#0d1f30"/>
            <rect x="262" y="265" width="10" height="8" rx="1.5" fill="#0d1f30"/>

            {/* Super Heavy booster */}
            <rect x="215" y="110" width="50" height="160" rx="5" fill="#0b1928"/>
            <rect x="218" y="113" width="44" height="154" rx="4" fill="#0e1f30"/>

            {/* Booster panel lines */}
            <line x1="228" y1="116" x2="228" y2="262" stroke="#091520" strokeWidth="0.6"/>
            <line x1="240" y1="116" x2="240" y2="262" stroke="#091520" strokeWidth="0.6"/>
            <line x1="252" y1="116" x2="252" y2="262" stroke="#091520" strokeWidth="0.6"/>
            <line x1="218" y1="170" x2="262" y2="170" stroke="#091520" strokeWidth="0.6"/>
            <line x1="218" y1="210" x2="262" y2="210" stroke="#091520" strokeWidth="0.6"/>

            {/* Grid fins */}
            <rect x="207" y="118" width="8" height="22" rx="1.5" fill="#091522"/>
            <rect x="265" y="118" width="8" height="22" rx="1.5" fill="#091522"/>
            <line x1="208" y1="124" x2="215" y2="124" stroke="#0d1f2f" strokeWidth="1"/>
            <line x1="208" y1="130" x2="215" y2="130" stroke="#0d1f2f" strokeWidth="1"/>
            <line x1="265" y1="124" x2="272" y2="124" stroke="#0d1f2f" strokeWidth="1"/>
            <line x1="265" y1="130" x2="272" y2="130" stroke="#0d1f2f" strokeWidth="1"/>

            {/* Interstage ring */}
            <rect x="214" y="108" width="52" height="5" rx="1" fill="#091520"/>

            {/* Starship upper stage */}
            <path d="M227,110 L231,42 L240,22 L249,42 L253,110 Z" fill="#0b1928"/>
            <path d="M229,110 L233,44 L240,24 L247,44 L251,110 Z" fill="#0e1f30"/>

            {/* Nose cone */}
            <path d="M238,24 L240,22 L242,24 L240,32 Z" fill="#1a3a5c" opacity="0.7"/>

            {/* Starship flaps */}
            <path d="M227,88 L212,108 L227,104 Z" fill="#091522"/>
            <path d="M253,88 L268,108 L253,104 Z" fill="#091522"/>
            <path d="M227,58 L213,74 L227,71 Z" fill="#091522"/>
            <path d="M253,58 L267,74 L253,71 Z" fill="#091522"/>

            {/* Panel lines on Starship */}
            <line x1="233" y1="46" x2="233" y2="108" stroke="#091520" strokeWidth="0.5"/>
            <line x1="247" y1="46" x2="247" y2="108" stroke="#091520" strokeWidth="0.5"/>

            {/* Launch tower */}
            <rect x="320" y="60" width="10" height="220" fill="#08111c"/>
            <rect x="320" y="60" width="3" height="220" fill="#0b1928"/>
            <rect x="318" y="108" width="28" height="5" rx="1" fill="#091520"/>
            <rect x="318" y="140" width="24" height="4" rx="1" fill="#091520"/>
            <rect x="318" y="170" width="20" height="4" rx="1" fill="#091520"/>

            {/* Mechazilla chopstick arm */}
            <rect x="330" y="90" width="36" height="6" rx="2" fill="#0b1928"/>
            <rect x="363" y="86" width="6" height="14" rx="2" fill="#0e2030"/>

            {/* SpaceX label */}
            <text x="240" y="293" textAnchor="middle" fontSize="7" fill="#1a3060" fontFamily="monospace" letterSpacing="4">STARSHIP · IFT</text>
          </svg>
          <p className="lc-caption">Starship — Sistema de transporte orbital reutilizable</p>
        </div>

        <div className="lc-badge">
          <div className="lc-dot" />
          <span className="lc-badge-text">Boca Chica, Texas</span>
        </div>
      </main>
    </>
  );
}
