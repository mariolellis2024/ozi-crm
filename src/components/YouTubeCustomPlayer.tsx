import React, { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore — plyr usa `export =` que TS não aceita como default import
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface YouTubeCustomPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
}

// Qualidades de thumbnail do YouTube (tentadas em ordem)
const YT_THUMB_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'] as const;

/**
 * Extrair YouTube ID de qualquer formato de URL
 */
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Custom Video Player para trailers de curso.
 * Usa Plyr.js para esconder branding do YouTube e oferecer controles customizados.
 * 
 * O player é pré-carregado por baixo da thumbnail para eliminar delay no play.
 * Versão simplificada (sem analytics, sem progress tracking).
 */
export function YouTubeCustomPlayer({ videoUrl, thumbnailUrl }: YouTubeCustomPlayerProps) {
  const videoId = getYouTubeId(videoUrl);

  const [phase, setPhase] = useState<'thumbnail' | 'playing' | 'ended'>('thumbnail');
  const [thumbSrc, setThumbSrc] = useState('');
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbQualityIdx, setThumbQualityIdx] = useState(0);
  const [plyrReady, setPlyrReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<Plyr | null>(null);

  // === Thumbnail logic ===
  useEffect(() => {
    if (!videoId) return;
    setThumbLoaded(false);
    setThumbQualityIdx(0);

    if (thumbnailUrl) {
      const img = new Image();
      img.onload = () => { setThumbSrc(thumbnailUrl); setThumbLoaded(true); };
      img.onerror = () => {
        setThumbSrc(`https://img.youtube.com/vi/${videoId}/${YT_THUMB_QUALITIES[0]}.jpg`);
        setThumbLoaded(true);
      };
      img.src = thumbnailUrl;
    } else {
      setThumbSrc(`https://img.youtube.com/vi/${videoId}/${YT_THUMB_QUALITIES[0]}.jpg`);
      setThumbLoaded(true);
    }
  }, [videoId, thumbnailUrl]);

  // Quando uma thumbnail do YouTube falha, tenta a próxima qualidade
  const handleThumbError = useCallback(() => {
    if (!videoId) return;
    const nextIdx = thumbQualityIdx + 1;
    if (nextIdx < YT_THUMB_QUALITIES.length) {
      setThumbQualityIdx(nextIdx);
      setThumbSrc(`https://img.youtube.com/vi/${videoId}/${YT_THUMB_QUALITIES[nextIdx]}.jpg`);
    }
  }, [videoId, thumbQualityIdx]);

  // === Plyr initialization — preload on mount ===
  useEffect(() => {
    if (!containerRef.current || !videoId) return;

    // Criar div de embed
    const wrapper = containerRef.current;
    wrapper.innerHTML = '';
    const embedDiv = document.createElement('div');
    embedDiv.setAttribute('data-plyr-provider', 'youtube');
    embedDiv.setAttribute('data-plyr-embed-id', videoId);
    wrapper.appendChild(embedDiv);

    // Inicializar Plyr (preloaded, sem autoplay)
    const plyr = new Plyr(embedDiv, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'fullscreen',
      ],
      speed: { selected: 1, options: [1] },
      autoplay: false, // Sem autoplay — o player fica pronto por baixo
      storage: { enabled: false },
      youtube: {
        noCookie: false,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        customControls: true,
      },
      tooltips: { controls: true, seek: true },
      keyboard: { focused: true, global: true },
      invertTime: false,
    });

    plyr.on('ready', () => {
      try { plyr.speed = 1; } catch { /* ignore */ }
      setPlyrReady(true);
    });

    // Quando o vídeo termina: destruir player e mostrar overlay de replay
    plyr.on('ended', () => {
      try { plyr.destroy(); } catch { /* ignore */ }
      plyrRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
      setPlyrReady(false);
      setPhase('ended');
    });

    plyrRef.current = plyr;

    return () => {
      try { plyr.destroy(); } catch { /* ignore */ }
      plyrRef.current = null;
      setPlyrReady(false);
    };
  }, [videoId]);

  // === Handlers ===
  function handlePlay() {
    setPhase('playing');
    // Player já está pronto — só dar play
    if (plyrRef.current) {
      try { plyrRef.current.play(); } catch { /* ignore */ }
    }
  }

  function handleReplay() {
    // Reinicializar o player para replay
    setPhase('thumbnail');
    // Vai re-montar o Plyr via useEffect quando containerRef estiver disponível novamente
    // Usar um pequeno delay para garantir que o DOM atualize
    setTimeout(() => {
      if (!containerRef.current || !videoId) return;

      const wrapper = containerRef.current;
      wrapper.innerHTML = '';
      const embedDiv = document.createElement('div');
      embedDiv.setAttribute('data-plyr-provider', 'youtube');
      embedDiv.setAttribute('data-plyr-embed-id', videoId);
      wrapper.appendChild(embedDiv);

      const plyr = new Plyr(embedDiv, {
        controls: [
          'play-large', 'play', 'progress', 'current-time',
          'duration', 'mute', 'volume', 'fullscreen',
        ],
        speed: { selected: 1, options: [1] },
        autoplay: false,
        storage: { enabled: false },
        youtube: {
          noCookie: false, rel: 0, showinfo: 0,
          iv_load_policy: 3, modestbranding: 1, customControls: true,
        },
        tooltips: { controls: true, seek: true },
        keyboard: { focused: true, global: true },
        invertTime: false,
      });

      plyr.on('ready', () => {
        try { plyr.speed = 1; } catch { /* ignore */ }
        setPlyrReady(true);
      });

      plyr.on('ended', () => {
        try { plyr.destroy(); } catch { /* ignore */ }
        plyrRef.current = null;
        if (containerRef.current) containerRef.current.innerHTML = '';
        setPlyrReady(false);
        setPhase('ended');
      });

      plyrRef.current = plyr;
    }, 50);
  }

  if (!videoId) return null;

  return (
    <div className="yt-player-container">
      {/* Plyr always mounted behind the overlay — preloads YouTube iframe */}
      <div
        ref={containerRef}
        className={`plyr-yt-wrap plyr-yt-wrap--preload ${phase === 'playing' ? 'plyr-yt-wrap--active' : ''}`}
      />

      {/* === Thumbnail Overlay === */}
      {phase === 'thumbnail' && (
        <div className="yt-player-thumb" onClick={handlePlay}>
          {thumbLoaded && thumbSrc && (
            <img
              src={thumbSrc}
              alt="Trailer"
              className="yt-player-thumb-img"
              onError={handleThumbError}
            />
          )}
          <button className="yt-player-play-btn" aria-label="Assistir trailer">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="40" fill="rgba(0,0,0,.55)" />
              <circle cx="40" cy="40" r="39" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
              <polygon points="33,24 33,56 58,40" fill="#fff" />
            </svg>
          </button>
        </div>
      )}

      {/* === Ended Overlay === */}
      {phase === 'ended' && (
        <div className="yt-player-ended" onClick={handleReplay}>
          {thumbSrc && (
            <img
              src={thumbSrc}
              alt="Trailer"
              className="yt-player-thumb-img yt-player-thumb-dim"
            />
          )}
          <button className="yt-player-replay-btn" aria-label="Assistir novamente">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Assistir novamente</span>
          </button>
        </div>
      )}
    </div>
  );
}
