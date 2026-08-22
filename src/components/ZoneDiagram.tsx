export default function ZoneDiagram() {
  return (
    <svg viewBox="0 0 300 340" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "58%", maxWidth: 420, height: "auto" }}>
      <style>{`
        .zc-path{
          fill:none;
          stroke:var(--ivory-dim);
          stroke-width:1;
          stroke-linecap:round;
          stroke-linejoin:round;
          stroke-dasharray: 1400;
          stroke-dashoffset: 1400;
          animation: zc-draw 2.6s cubic-bezier(0.65,0,0.35,1) forwards;
        }
        .zc-path.zc-delay1{ animation-delay:0.15s; }
        .zc-path.zc-delay2{ animation-delay:0.35s; }
        .zc-path.zc-delay3{ animation-delay:0.55s; }
        @keyframes zc-draw{ to{ stroke-dashoffset:0; } }
        .zc-dot{
          fill:var(--gold);
          opacity:0;
          animation: zc-fadein 0.4s ease forwards;
          animation-delay: 2.4s;
        }
        @keyframes zc-fadein{ to{ opacity:1; } }
        .zc-label-num{ fill:var(--gold); }
        .zc-label-name{ fill:var(--ivory-dim); }
        @media (prefers-reduced-motion: reduce){
          .zc-path{ animation:none; stroke-dashoffset:0; }
          .zc-dot{ animation:none; opacity:1; }
        }
      `}</style>
      <path className="zc-path" d="M150 30 C 90 30 60 80 60 140 C 60 190 75 220 90 250 C 100 270 110 300 110 320 L 190 320 C 190 300 200 270 210 250 C 225 220 240 190 240 140 C 240 80 210 30 150 30 Z" />
      <path className="zc-path zc-delay1" d="M85 75 C 105 50 195 50 215 75" />
      <path className="zc-path zc-delay1" d="M75 140 C 90 130 90 200 78 230" />
      <path className="zc-path zc-delay1" d="M225 140 C 210 130 210 200 222 230" />
      <path className="zc-path zc-delay2" d="M78 100 C 100 85 200 85 222 100" />
      <path className="zc-path zc-delay2" d="M80 175 L 78 220" />
      <path className="zc-path zc-delay2" d="M220 175 L 222 220" />
      <path className="zc-path zc-delay3" d="M105 275 C 130 290 170 290 195 275" />
      <circle className="zc-path zc-delay3" cx="70" cy="160" r="6" />
      <circle className="zc-path zc-delay3" cx="230" cy="160" r="6" />
      <circle className="zc-dot" cx="150" cy="58" r="2.5" />
      <text fontFamily="var(--font-mono), monospace" fontSize="10" letterSpacing="0.1em" x="158" y="55">
        <tspan className="zc-label-num">Z-01</tspan>
        <tspan className="zc-label-name" dx="6">CROWN</tspan>
      </text>
    </svg>
  );
}
