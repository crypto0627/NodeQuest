import { useEffect, useRef } from "react";

export default function RewardModal({ onClose, onRestart }: { onClose?: () => void, onRestart?: () => void }) {
  const neonGlowRef = useRef<HTMLDivElement>(null);

  // Optional: Animate the neon border glow
  useEffect(() => {
    let frame = 0;
    let raf: number;
    const animate = () => {
      if (neonGlowRef.current) {
        neonGlowRef.current.style.boxShadow = `
          0 0 32px #00fff7, 
          0 0 64px #ff00e6, 
          0 0 128px #39ff14${Math.abs(Math.sin(frame/30)).toFixed(2)}
        `;
      }
      frame++;
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-gradient-to-br from-[#0a0f1c] via-[#181c24cc] to-[#0a0f1c]">
      {/* Animated Neon Border Container */}
      <div
        ref={neonGlowRef}
        className="relative flex flex-col items-center justify-center px-12 py-10 rounded-3xl border-[3.5px] border-[#00fff7] shadow-[0_0_64px_#00fff7,0_0_128px_#ff00e6] bg-[rgba(18,24,40,0.98)]"
        style={{
          minWidth: 360,
          maxWidth: 420,
          boxShadow: "0 0 32px #00fff7, 0 0 64px #ff00e6, 0 0 128px #39ff14",
          borderImage: "linear-gradient(90deg,#00fff7,#ff00e6,#39ff14) 1",
          borderRadius: "2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Futuristic Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-7 z-10 bg-transparent border-none text-[#00fff7] text-[2.5rem] font-extrabold cursor-pointer transition-colors duration-200 hover:text-[#ff00e6] focus:outline-none"
          style={{
            textShadow: "0 0 16px #00fff7, 0 0 32px #ff00e6, 0 0 8px #39ff14",
            filter: "drop-shadow(0 0 8px #00fff7)",
          }}
          aria-label="Close"
        >
          ×
        </button>
        {/* Cyberpunk Trophy/Reward Icon */}
        <div className="mb-2 flex items-center justify-center">
          <span
            className="text-[3.2rem] animate-pulse"
            style={{
              filter: "drop-shadow(0 0 16px #ffe066) drop-shadow(0 0 32px #00fff7)",
            }}
          >
            🏆
          </span>
        </div>
        {/* Main Title */}
        <div
          className="text-[2.2rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00fff7] via-[#ffe066] to-[#ff00e6] tracking-widest mb-2 [text-shadow:0_0_24px_#00fff7,0_0_48px_#ff00e6]"
          style={{
            letterSpacing: "0.08em",
            textShadow: "0 0 24px #00fff7, 0 0 48px #ff00e6",
          }}
        >
          FINISH LINE REACHED!
        </div>
        {/* Subtitle */}
        <div className="text-lg text-[#39ff14] font-semibold mb-6 tracking-wide [text-shadow:0_0_8px_#00fff7]">
          You conquered the Laser Corridor.
        </div>
        {/* Reward Section */}
        <div className="flex flex-col items-center mb-7">
          <div className="text-[1.5rem] font-bold text-[#ffe066] flex items-center gap-2 [text-shadow:0_0_12px_#ffe066,0_0_24px_#00fff7]">
            <svg width="32" height="32" viewBox="0 0 32 32" className="inline-block mr-1" fill="none">
              <circle cx="16" cy="16" r="15" fill="#ffe066" stroke="#00fff7" strokeWidth="2"/>
              <text x="16" y="22" textAnchor="middle" fontSize="16" fill="#222" fontWeight="bold">₡</text>
            </svg>
            +200 Coins
          </div>
          <div className="mt-2 text-[#00fff7] text-sm font-mono tracking-wider opacity-80">
            Reward credited to your account
          </div>
        </div>
        {/* Play Again Button */}
        <button
          onClick={() => onRestart ? onRestart() : window.location.reload()}
          className="text-[1.3rem] px-8 py-2 rounded-xl border-none font-extrabold cursor-pointer mt-2 shadow-[0_0_16px_#00fff7,0_0_32px_#ff00e6] text-white transition-all duration-200 bg-gradient-to-r from-[#00fff7] via-[#39ff14] to-[#ff00e6] hover:from-[#ff00e6] hover:to-[#00fff7] focus:outline-none"
          style={{
            background: "linear-gradient(90deg,#00fff7,#ff00e6)",
            textShadow: "0 0 8px #fff, 0 0 16px #00fff7",
            letterSpacing: "0.04em",
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'linear-gradient(90deg,#ff00e6,#00fff7)')}
          onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(90deg,#00fff7,#ff00e6)')}
        >
          Play Again
        </button>
        {/* Futuristic bottom accent */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[80%] h-[6px] rounded-b-xl"
          style={{
            background: "linear-gradient(90deg,#00fff7,#ff00e6,#39ff14)",
            filter: "blur(2px) brightness(1.3)",
            opacity: 0.7,
          }}
        />
        {/* Animated neon lines */}
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{
            background: "linear-gradient(90deg,transparent,#00fff7 40%,#ff00e6 60%,transparent)",
            filter: "blur(1.5px)",
            opacity: 0.7,
          }}
        />
        <div
          className="absolute right-0 top-0 h-full w-1"
          style={{
            background: "linear-gradient(180deg,transparent,#ff00e6 40%,#00fff7 60%,transparent)",
            filter: "blur(1.5px)",
            opacity: 0.7,
          }}
        />
      </div>
      {/* Cyberpunk animated background grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ opacity: 0.13 }}
      >
        <defs>
          <linearGradient id="gridline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00fff7" />
            <stop offset="100%" stopColor="#ff00e6" />
          </linearGradient>
        </defs>
        {/* Vertical lines */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1={`${(i + 1) * 8.3}%`}
            y1="0"
            x2={`${(i + 1) * 8.3}%`}
            y2="100%"
            stroke="url(#gridline)"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}
        {/* Horizontal lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={`${(i + 1) * 14.2}%`}
            x2="100%"
            y2={`${(i + 1) * 14.2}%`}
            stroke="url(#gridline)"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}
      </svg>
    </div>
  );
}