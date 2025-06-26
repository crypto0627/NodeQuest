import React, { useEffect, useRef } from "react";

// Component-specific styles for animations and complex visuals
const RewardModalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes backgroundGridAnimate {
    from { background-position: 0 0; }
    to { background-position: 0 -100px; }
  }
  @keyframes trophyFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .reward-modal-backdrop {
    animation: fadeIn 0.4s ease-out forwards;
  }
  .reward-modal-content {
    animation: fadeIn 0.5s ease-out 0.1s forwards;
    opacity: 0;
    animation-fill-mode: forwards;
  }
  .play-again-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    background: linear-gradient(90deg, #00fff7, #ff00e6);
  }
  .play-again-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px #00fff7, 0 0 40px #ff00e6;
  }
  .play-again-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(120deg, transparent, rgba(57, 255, 20, 0.4), transparent);
    transition: left 0.7s ease;
  }
  .play-again-btn:hover::before {
    left: 100%;
  }
`;

export default function RewardModal({ onClose, onRestart }: { onClose?: () => void, onRestart?: () => void }) {
  const neonGlowRef = useRef<HTMLDivElement>(null);

  // Animate the neon border glow using requestAnimationFrame
  useEffect(() => {
    let frame = 0;
    let raf: number;
    const animate = () => {
      if (neonGlowRef.current) {
        const greenGlowAlpha = Math.abs(Math.sin(frame / 40)).toFixed(2);
        neonGlowRef.current.style.boxShadow = `
          0 0 25px #00fff7, 
          0 0 50px #ff00e6, 
          0 0 75px rgba(57, 255, 20, ${greenGlowAlpha})
        `;
      }
      frame++;
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <style>{RewardModalStyles}</style>
      <div className="reward-modal-backdrop fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="absolute inset-0 w-full h-full pointer-events-none z-[-1] opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 247, 0.5) 1px, transparent 1px),
            linear-gradient(to right, rgba(255, 0, 230, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'backgroundGridAnimate 3s linear infinite',
        }}></div>
        
        {/* Animated Neon Border Container */}
        <div
          ref={neonGlowRef}
          className="reward-modal-content relative flex flex-col items-center justify-center px-12 py-10 rounded-3xl border-[3px] border-[#00fff7] bg-[rgba(10,15,30,0.92)]"
          style={{
            minWidth: 380,
            maxWidth: 440,
            // Initial box-shadow, will be animated by useEffect
            boxShadow: "0 0 25px #00fff7, 0 0 50px #ff00e6, 0 0 75px #39ff14",
          }}
        >
          {/* Futuristic Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-6 z-10 text-[#00fff7] text-4xl font-bold transition-all duration-300 hover:text-[#ff00e6] hover:scale-110 focus:outline-none"
            style={{ textShadow: "0 0 8px #00fff7, 0 0 16px #ff00e6" }}
            aria-label="Close"
          >
            ×
          </button>
          
          {/* Cyberpunk Trophy Icon */}
          <div className="mb-4 animate-[trophyFloat_3s_ease-in-out_infinite]">
            <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="trophyGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="trophyFill" x1="32" y1="10" x2="32" y2="54" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ffe066"/>
                  <stop offset="1" stopColor="#ffae00"/>
                </linearGradient>
              </defs>
              <g style={{ filter: 'url(#trophyGlow)' }}>
                <path d="M18 10H46V18C46 22.4183 42.4183 26 38 26H26C21.5817 26 18 22.4183 18 18V10Z" fill="url(#trophyFill)" stroke="#00fff7" strokeWidth="2"/>
                <path d="M32 26V42" stroke="#00fff7" strokeWidth="2"/>
                <path d="M22 42H42" stroke="#00fff7" strokeWidth="2"/>
                <path d="M20 54H44L40 42H24L20 54Z" fill="url(#trophyFill)" stroke="#00fff7" strokeWidth="2"/>
              </g>
            </svg>
          </div>

          {/* Main Title */}
          <h1
            className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00fff7] via-[#ffe066] to-[#ff00e6] tracking-wider mb-2"
            style={{ textShadow: "0 0 16px rgba(0, 255, 247, 0.5), 0 0 32px rgba(255, 0, 230, 0.5)" }}
          >
            FINISH LINE
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg text-[#39ff14] font-semibold mb-6 tracking-wide" style={{ textShadow: "0 0 8px #39ff14" }}>
            You conquered the Laser Corridor.
          </p>

          {/* Reward Section */}
          <div className="flex flex-col items-center mb-8 p-4 rounded-lg bg-white/5 border border-cyan-400/20 w-full">
            <div className="text-2xl font-bold text-[#ffe066] flex items-center gap-3" style={{ textShadow: "0 0 12px #ffe066" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="coinGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#ffe066" />
                    <stop offset="100%" stopColor="#ffc107" />
                  </linearGradient>
                  <filter id="coinGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.5" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <g filter="url(#coinGlow)">
                  <path d="M16 2L29.8564 9V23L16 30L2.1436 23V9L16 2Z" fill="url(#coinGrad)" opacity="0.4" />
                </g>
                <path d="M16 2L29.8564 9V23L16 30L2.1436 23V9L16 2Z" stroke="#00fff7" strokeWidth="1.5" />
                <text x="16" y="21" textAnchor="middle" fontSize="14" fill="#ffe066" fontWeight="bold" style={{ textShadow: '0 0 4px #ffe066' }}>
                  C
                </text>
              </svg>
              +200 Credits
            </div>
            <p className="mt-2 text-[#00fff7] text-sm font-mono tracking-wider opacity-80">
              Credited to your databank
            </p>
          </div>

          {/* Play Again Button */}
          <button
            onClick={() => onRestart ? onRestart() : window.location.reload()}
            className="play-again-btn text-xl px-10 py-3 rounded-xl border-none font-extrabold cursor-pointer text-white"
            style={{ textShadow: "0 0 8px #fff, 0 0 16px #00fff7" }}
          >
            Play Again
          </button>
        </div>
      </div>
    </>
  );
}