/**
 * OZI CRM — Form Widget Embed Script
 * 
 * Usage:
 * 1. Add the script tag once on the page:
 *    <script src="https://crm.ozi.com.br/widget.js"></script>
 * 
 * 2. Add data-ozi-form="form-slug" to any button/link:
 *    <button data-ozi-form="autoridade-digital">Inscreva-se</button>
 * 
 * The form will open as a modal overlay on the current page.
 */
(function() {
  'use strict';

  // Detect the base URL from the script tag src
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var scriptSrc = currentScript.src || '';
  var baseUrl = scriptSrc.replace(/\/widget\.js.*$/, '');

  // If no src detected, try the current origin
  if (!baseUrl) {
    baseUrl = window.location.origin;
  }

  // CSS styles for the modal overlay
  var STYLES = [
    '.ozi-widget-overlay {',
    '  position: fixed;',
    '  top: 0; left: 0; right: 0; bottom: 0;',
    '  background: rgba(0, 0, 0, 0.7);',
    '  z-index: 999999;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  opacity: 0;',
    '  transition: opacity 0.3s ease;',
    '  padding: 16px;',
    '}',
    '.ozi-widget-overlay.ozi-visible {',
    '  opacity: 1;',
    '}',
    '.ozi-widget-container {',
    '  position: relative;',
    '  width: 100%;',
    '  max-width: 520px;',
    '  max-height: 90vh;',
    '  border-radius: 20px;',
    '  overflow: hidden;',
    '  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);',
    '  transform: scale(0.9) translateY(20px);',
    '  transition: transform 0.3s ease;',
    '}',
    '.ozi-widget-overlay.ozi-visible .ozi-widget-container {',
    '  transform: scale(1) translateY(0);',
    '}',
    '.ozi-widget-close {',
    '  position: absolute;',
    '  top: 12px; right: 12px;',
    '  width: 36px; height: 36px;',
    '  background: rgba(0, 0, 0, 0.6);',
    '  border: none;',
    '  border-radius: 50%;',
    '  color: #fff;',
    '  font-size: 20px;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  z-index: 10;',
    '  transition: background 0.2s;',
    '  line-height: 1;',
    '}',
    '.ozi-widget-close:hover {',
    '  background: rgba(0, 0, 0, 0.8);',
    '}',
    '.ozi-widget-iframe {',
    '  width: 100%;',
    '  height: 85vh;',
    '  max-height: 700px;',
    '  border: none;',
    '  display: block;',
    '}',
    '.ozi-widget-loader {',
    '  position: absolute;',
    '  top: 50%; left: 50%;',
    '  transform: translate(-50%, -50%);',
    '  width: 40px; height: 40px;',
    '  border: 3px solid rgba(255,255,255,0.2);',
    '  border-top-color: #14b8a6;',
    '  border-radius: 50%;',
    '  animation: ozi-spin 0.8s linear infinite;',
    '}',
    '@keyframes ozi-spin {',
    '  to { transform: translate(-50%, -50%) rotate(360deg); }',
    '}'
  ].join('\n');

  // Inject styles
  var styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Build the form URL with tracking params from the host page
  function buildFormUrl(slug) {
    var url = baseUrl + '/f/' + slug + '?embed=1';

    // Pass fbclid from current page URL
    var urlParams = new URLSearchParams(window.location.search);
    var fbclid = urlParams.get('fbclid');
    if (fbclid) {
      url += '&fbclid=' + encodeURIComponent(fbclid);
    }

    // Pass referrer
    if (document.referrer) {
      url += '&ref=' + encodeURIComponent(document.referrer);
    }

    return url;
  }

  // Open the modal
  function openModal(slug) {
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'ozi-widget-overlay';
    overlay.setAttribute('id', 'ozi-widget-overlay');

    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Container
    var container = document.createElement('div');
    container.className = 'ozi-widget-container';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'ozi-widget-close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.title = 'Fechar';
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeModal();
    });

    // Loader
    var loader = document.createElement('div');
    loader.className = 'ozi-widget-loader';
    loader.setAttribute('id', 'ozi-widget-loader');

    // Iframe
    var iframe = document.createElement('iframe');
    iframe.className = 'ozi-widget-iframe';
    iframe.src = buildFormUrl(slug);
    iframe.allow = 'clipboard-write';
    iframe.addEventListener('load', function() {
      var loaderEl = document.getElementById('ozi-widget-loader');
      if (loaderEl) loaderEl.remove();
    });

    container.appendChild(closeBtn);
    container.appendChild(loader);
    container.appendChild(iframe);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(function() {
      overlay.classList.add('ozi-visible');
    });

    // Close on Escape key
    document.addEventListener('keydown', handleEscape);
  }

  function closeModal() {
    var overlay = document.getElementById('ozi-widget-overlay');
    if (!overlay) return;

    overlay.classList.remove('ozi-visible');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEscape);

    setTimeout(function() {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }

  function handleEscape(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  // Initialize: attach click handlers to all elements with data-ozi-form
  function init() {
    var elements = document.querySelectorAll('[data-ozi-form]');
    for (var i = 0; i < elements.length; i++) {
      (function(el) {
        // Avoid double-binding
        if (el.getAttribute('data-ozi-bound')) return;
        el.setAttribute('data-ozi-bound', '1');

        el.style.cursor = 'pointer';
        el.addEventListener('click', function(e) {
          e.preventDefault();
          var slug = el.getAttribute('data-ozi-form');
          if (slug) {
            openModal(slug);
          }
        });
      })(elements[i]);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also expose global function for programmatic use
  window.OziWidget = {
    open: function(slug) { openModal(slug); },
    close: function() { closeModal(); }
  };

  // Re-init on any dynamic content changes (MutationObserver)
  if (window.MutationObserver) {
    var observer = new MutationObserver(function() {
      init();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
