import React from 'react';

export function OrganicBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Linhas orgânicas */}
      <div className="organic-line">
        <svg>
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(44, 211, 199, 0.3)" />
              <stop offset="100%" stopColor="rgba(44, 211, 199, 0.1)" />
            </linearGradient>
            <linearGradient id="gradient1-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(66, 153, 225, 0.4)" />
              <stop offset="100%" stopColor="rgba(66, 153, 225, 0.2)" />
            </linearGradient>
          </defs>
          <path d="M -100,150 Q 200,100 400,150 T 800,150 T 1200,150 T 1700,150" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <defs>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.2)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.05)" />
            </linearGradient>
            <linearGradient id="gradient2-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(147, 51, 234, 0.3)" />
              <stop offset="100%" stopColor="rgba(147, 51, 234, 0.1)" />
            </linearGradient>
          </defs>
          <path d="M -100,300 Q 300,200 600,300 T 1200,300 T 1900,300" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <defs>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.15)" />
              <stop offset="100%" stopColor="rgba(236, 72, 153, 0.03)" />
            </linearGradient>
            <linearGradient id="gradient3-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(219, 39, 119, 0.25)" />
              <stop offset="100%" stopColor="rgba(219, 39, 119, 0.08)" />
            </linearGradient>
          </defs>
          <path d="M -100,450 Q 400,350 800,450 T 1700,450" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <defs>
            <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
            </linearGradient>
            <linearGradient id="gradient4-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(37, 99, 235, 0.3)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0.1)" />
            </linearGradient>
          </defs>
          <path d="M -100,600 Q 200,500 400,600 T 800,600 T 1300,600" />
        </svg>
      </div>

      <div className="organic-line">
        <svg>
          <defs>
            <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.25)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.08)" />
            </linearGradient>
            <linearGradient id="gradient5-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(5, 150, 105, 0.35)" />
              <stop offset="100%" stopColor="rgba(5, 150, 105, 0.12)" />
            </linearGradient>
          </defs>
          <path d="M -100,750 Q 500,650 1000,750 T 2200,750" />
        </svg>
      </div>

      {/* Partículas orgânicas */}
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
    </div>
  );
}