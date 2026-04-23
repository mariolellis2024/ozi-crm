import React, { useEffect, useRef } from 'react';

interface VturbPlayerProps {
  embedCode: string;
  speedCode?: string;
}

/**
 * Componente para renderizar player VTURB.
 * Injeta o código de embed + código de velocidade no DOM.
 * Scripts precisam ser criados via DOM API (innerHTML não executa scripts).
 */
export function VturbPlayer({ embedCode, speedCode }: VturbPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);

  // Inject speed code into head (preload hints)
  useEffect(() => {
    if (!speedCode) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(speedCode, 'text/html');
    const injectedElements: Node[] = [];

    // Inject link elements (preload, dns-prefetch)
    doc.querySelectorAll('link').forEach((link) => {
      const el = document.createElement('link');
      Array.from(link.attributes).forEach((attr) => {
        el.setAttribute(attr.name, attr.value);
      });
      document.head.appendChild(el);
      injectedElements.push(el);
    });

    // Inject script elements from speed code
    doc.querySelectorAll('script').forEach((script) => {
      const el = document.createElement('script');
      if (script.src) {
        el.src = script.src;
        el.async = script.async;
      } else {
        el.textContent = script.textContent;
      }
      document.head.appendChild(el);
      injectedElements.push(el);
    });

    return () => {
      injectedElements.forEach((el) => {
        try { el.parentNode?.removeChild(el); } catch { /* ignore */ }
      });
    };
  }, [speedCode]);

  // Inject embed code into container
  useEffect(() => {
    if (!containerRef.current || !embedCode) return;

    const container = containerRef.current;
    const parser = new DOMParser();
    const doc = parser.parseFromString(embedCode, 'text/html');

    // Clear container
    container.innerHTML = '';

    // Add non-script elements (the vturb-smartplayer custom element)
    doc.body.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName.toLowerCase() !== 'script') {
          container.appendChild(document.importNode(el, true));
        }
      }
    });

    // Create and inject script elements (must be done via DOM API to execute)
    const scripts: HTMLScriptElement[] = [];
    doc.querySelectorAll('script').forEach((script) => {
      const el = document.createElement('script');
      el.type = 'text/javascript';
      if (script.src) {
        el.src = script.src;
        el.async = true;
      } else {
        el.textContent = script.textContent;
      }
      container.appendChild(el);
      scripts.push(el);
    });

    return () => {
      // Cleanup scripts on unmount
      scripts.forEach((el) => {
        try { el.parentNode?.removeChild(el); } catch { /* ignore */ }
      });
      container.innerHTML = '';
    };
  }, [embedCode]);

  if (!embedCode) return null;

  return (
    <div className="vturb-player-container">
      <div ref={containerRef} />
    </div>
  );
}
