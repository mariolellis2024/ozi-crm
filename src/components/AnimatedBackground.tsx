import React from 'react';

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Linhas orgânicas */}
      <div className="organic-line">
        <svg>
          <defs>
            {/* Gradientes brancos e vermelhos alternados */}
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.1)" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
            </linearGradient>
            <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(220, 38, 38, 0.3)" />
              <stop offset="100%" stopColor="rgba(220, 38, 38, 0.08)" />
            </linearGradient>
            <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
            </linearGradient>
          </defs>
          <path className="organic-path-1" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <path className="organic-path-2" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <path className="organic-path-3" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <path className="organic-path-4" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <path className="organic-path-5" />
        </svg>
      </div>

      {/* Partículas orgânicas */}
      <div className="organic-particle" style={{ top: '25%', left: '20%', animationDelay: '0s' }} />
      <div className="organic-particle" style={{ top: '45%', right: '30%', animationDelay: '-3s' }} />
      <div className="organic-particle" style={{ bottom: '35%', left: '40%', animationDelay: '-6s' }} />
      <div className="organic-particle" style={{ top: '70%', right: '20%', animationDelay: '-9s' }} />
      <div className="organic-particle" style={{ top: '15%', left: '70%', animationDelay: '-12s' }} />
      <div className="organic-particle" style={{ top: '60%', left: '15%', animationDelay: '-15s' }} />
      <div className="organic-particle" style={{ bottom: '20%', right: '40%', animationDelay: '-18s' }} />
      <div className="organic-particle" style={{ top: '35%', left: '80%', animationDelay: '-21s' }} />
    </div>
  );
}