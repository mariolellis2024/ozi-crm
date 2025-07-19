import React from 'react';

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Linhas orgânicas */}
      <div className="organic-line">
        <svg>
          <defs>
            {/* Gradientes para modo escuro */}
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(44, 211, 199, 0.3)" />
              <stop offset="100%" stopColor="rgba(44, 211, 199, 0.1)" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.05)" />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.25)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0.08)" />
            </linearGradient>
            <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.2)" />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0.06)" />
            </linearGradient>
            <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(251, 146, 60, 0.3)" />
              <stop offset="100%" stopColor="rgba(251, 146, 60, 0.1)" />
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