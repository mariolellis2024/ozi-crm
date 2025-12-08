export function OrganicBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 1400 900"
      >
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2CD3C7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2CD3C7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0891B2" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891B2" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2CD3C7" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2CD3C7" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891B2" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="gradient1-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4299E1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38A169" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gradient2-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4299E1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3182CE" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gradient3-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3182CE" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4299E1" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gradient4-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38A169" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4299E1" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gradient5-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3182CE" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38A169" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <g className="organic-line">
          <path d="M -100,150 Q 200,100 400,150 T 800,150 T 1200,150 T 1700,150" />
        </g>
        <g className="organic-line">
          <path d="M -100,300 Q 300,200 600,300 T 1200,300 T 1700,300" />
        </g>
        <g className="organic-line">
          <path d="M -100,450 Q 400,350 800,450 T 1200,450 T 1700,450" />
        </g>
        <g className="organic-line">
          <path d="M -100,600 Q 200,500 400,600 T 800,600 T 1200,600 T 1700,600" />
        </g>
        <g className="organic-line">
          <path d="M -100,750 Q 500,650 1000,750 T 1700,750" />
        </g>
      </svg>

      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
    </div>
  );
}
