/**
 * Content Script for Ultimate Guitar to ChordPro Converter
 * Injected on https://tabs.ultimate-guitar.com/*
 */

(function () {
  // Prevent double injection
  if (window.__ugChordProInjected) return;
  window.__ugChordProInjected = true;

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract_tab') {
      const result = window.UG2ChordPro ? window.UG2ChordPro.extractFromDOM(document) : null;
      sendResponse({ success: !!result, data: result });
    }
  });

  // Inject a floating "Convert to ChordPro" button on the Ultimate Guitar page
  function createFloatingButton() {
    if (document.getElementById('ug-chordpro-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'ug-chordpro-fab';
    const iconUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('icon48.png')
      : '';
    fab.innerHTML = `
      ${iconUrl ? `<img src="${iconUrl}" alt="" style="width: 18px; height: 18px; margin-right: 6px; object-fit: contain;">` : `<span style="font-size: 16px; margin-right: 6px;">♫</span>`}
      <span>ChordPro</span>
    `;

    Object.assign(fab.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '999999',
      backgroundColor: '#f59e0b',
      color: '#000000',
      fontWeight: '700',
      fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '10px 18px',
      borderRadius: '50px',
      border: 'none',
      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4), 0 2px 6px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.2s ease',
    });

    fab.onmouseenter = () => {
      fab.style.transform = 'scale(1.05)';
      fab.style.backgroundColor = '#fbbf24';
    };
    fab.onmouseleave = () => {
      fab.style.transform = 'scale(1)';
      fab.style.backgroundColor = '#f59e0b';
    };

    fab.onclick = showChordProModal;

    document.body.appendChild(fab);
  }

  let currentTranspose = 0;
  let currentResult = null;

  function showChordProModal() {
    if (document.getElementById('ug-chordpro-modal')) {
      document.getElementById('ug-chordpro-modal').style.display = 'flex';
      return;
    }

    const { content, metadata } = window.UG2ChordPro.extractFromDOM(document);
    if (!content) {
      alert('Could not find tab content on this page. Make sure you are on a tab page with chords.');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'ug-chordpro-modal';
    Object.assign(modal.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '1000000',
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    modal.innerHTML = `
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 14px; width: 100%; max-width: 780px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); color: #f4f4f5;">
        <!-- Header -->
        <div style="padding: 16px 20px; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; background: #27272a/50;">
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px;">
              <span style="color: #f59e0b;">♫</span>
              <span>ChordPro Export</span>
              <span style="font-size: 11px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 6px; rounded: 4px; border-radius: 4px;">.cho</span>
            </h3>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #a1a1aa;">${metadata.title || 'Tab'} by ${metadata.artist || 'Unknown'}</p>
          </div>
          <button id="ug-modal-close" style="background: transparent; border: none; color: #a1a1aa; font-size: 20px; cursor: pointer; padding: 4px 8px;">✕</button>
        </div>

        <!-- Controls Bar -->
        <div style="padding: 10px 20px; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; font-size: 12px; background: #18181b;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #71717a;">Transpose:</span>
            <button id="ug-trans-down" style="background: #27272a; border: none; color: #ffffff; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">-1</button>
            <span id="ug-trans-val" style="font-family: monospace; font-weight: bold; color: #f59e0b; width: 24px; text-align: center;">0</span>
            <button id="ug-trans-up" style="background: #27272a; border: none; color: #ffffff; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">+1</button>
          </div>

          <div style="display: flex; items-center; gap: 8px;">
            <button id="ug-btn-copy" style="background: #27272a; border: none; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">📋 Copy</button>
            <button id="ug-btn-dl" style="background: #f59e0b; border: none; color: #000000; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">💾 Download .cho</button>
          </div>
        </div>

        <!-- Editor Area -->
        <div style="flex: 1; padding: 16px 20px; overflow-y: auto;">
          <textarea id="ug-modal-output" readonly style="width: 100%; height: 420px; background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; color: #fef08a; font-family: 'Fira Code', 'Courier New', monospace; font-size: 12px; line-height: 1.5; resize: none; outline: none;"></textarea>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    function updateOutput() {
      currentResult = window.UG2ChordPro.convert(content, {
        metadata: metadata,
        transposeSemitones: currentTranspose,
        useShortDirectives: false,
        useSectionEnvironments: true,
        includeMetaHeader: true,
      });
      document.getElementById('ug-modal-output').value = currentResult.chordpro;
      document.getElementById('ug-trans-val').innerText = (currentTranspose > 0 ? '+' : '') + currentTranspose;
    }

    document.getElementById('ug-modal-close').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    document.getElementById('ug-trans-down').onclick = () => { currentTranspose--; updateOutput(); };
    document.getElementById('ug-trans-up').onclick = () => { currentTranspose++; updateOutput(); };

    document.getElementById('ug-btn-copy').onclick = () => {
      const text = document.getElementById('ug-modal-output').value;
      navigator.clipboard.writeText(text);
      const b = document.getElementById('ug-btn-copy');
      b.innerText = '✓ Copied!';
      setTimeout(() => { b.innerText = '📋 Copy'; }, 2000);
    };

    document.getElementById('ug-btn-dl').onclick = () => {
      const text = document.getElementById('ug-modal-output').value;
      const fn = ((metadata.title || 'song') + '.cho').toLowerCase().replace(/[^a-z0-9.]+/g, '_');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fn;
      a.click();
    };

    updateOutput();
  }

  // Inject floating button when page is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createFloatingButton();
  } else {
    window.addEventListener('DOMContentLoaded', createFloatingButton);
  }
})();
