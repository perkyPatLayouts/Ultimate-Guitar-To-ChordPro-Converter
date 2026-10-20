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
            <button id="ug-btn-pdf" style="background: #059669; border: none; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">📄 PDF Chart</button>
            <button id="ug-btn-dl" style="background: #f59e0b; border: none; color: #000000; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">💾 .cho</button>
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

    document.getElementById('ug-btn-pdf').onclick = () => {
      const text = document.getElementById('ug-modal-output').value;
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(renderPrintableChordChart(text));
        printWin.document.close();
      }
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

  // Render printable chord chart with chords arranged on top of lyrics
  function renderPrintableChordChart(chordproText) {
    const lines = chordproText.split(/\r?\n/);
    let title = 'Song';
    let subtitle = '';
    const metaItems = [];
    let bodyHtml = '';
    let inTab = false;
    let tabLines = [];

    function flushTab() {
      if (tabLines.length > 0) {
        bodyHtml += '<pre style="font-family:\'Courier New\',monospace;font-size:12px;line-height:1.4;background:#f3f4f6;padding:10px;border-radius:6px;margin:10px 0;overflow-x:auto;">' + tabLines.join('\n') + '</pre>';
        tabLines = [];
      }
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inTab) { tabLines.push(''); }
        else { bodyHtml += '<div style="height:10px;"></div>'; }
        continue;
      }

      const dirMatch = trimmed.match(/^\{([a-zA-Z0-9_\-]+)(?::\s*(.*?))?\}$/);
      if (dirMatch) {
        const name = dirMatch[1].toLowerCase();
        const val = (dirMatch[2] || '').trim();

        if (name === 'title' || name === 't') { title = val; continue; }
        if (name === 'subtitle' || name === 'st') { subtitle = val; continue; }
        if (name === 'key') { metaItems.push('Key: <strong>' + val + '</strong>'); continue; }
        if (name === 'capo') { metaItems.push('Capo: <strong>' + val + '</strong>'); continue; }
        if (name === 'tempo') { metaItems.push('Tempo: <strong>' + val + ' BPM</strong>'); continue; }
        if (name === 'tuning') { metaItems.push('Tuning: <strong>' + val + '</strong>'); continue; }

        if (name === 'start_of_tab' || name === 'sot') { inTab = true; continue; }
        if (name === 'end_of_tab' || name === 'eot') { inTab = false; flushTab(); continue; }

        if (name.startsWith('start_of_') || name === 'sov' || name === 'soc' || name === 'sob') {
          flushTab();
          const label = val || (name.includes('chorus') || name === 'soc' ? 'CHORUS' : (name.includes('bridge') || name === 'sob' ? 'BRIDGE' : 'VERSE'));
          bodyHtml += '<div style="font-weight:700;font-size:11px;color:#1e3a8a;text-transform:uppercase;margin:16px 0 6px 0;padding-bottom:2px;border-bottom:1px solid #e5e7eb;">' + label + '</div>';
          continue;
        }
        if (name.startsWith('end_of_') || name === 'eov' || name === 'eoc' || name === 'eob') {
          flushTab();
          bodyHtml += '<div style="height:6px;"></div>';
          continue;
        }
        if (name === 'comment' || name === 'c') {
          flushTab();
          bodyHtml += '<div style="font-weight:600;font-size:11px;color:#4b5563;margin:10px 0 4px 0;">[ ' + val + ' ]</div>';
          continue;
        }
        continue;
      }

      if (inTab) {
        tabLines.push(line);
        continue;
      }

      const chordLyricRegex = /\[([^\]]+)\]|([^\[]+)/g;
      let match;
      const tokens = [];
      let pendingChord = null;

      while ((match = chordLyricRegex.exec(line)) !== null) {
        if (match[1]) {
          if (pendingChord) tokens.push({ chord: pendingChord, lyric: '' });
          pendingChord = match[1];
        } else if (match[2]) {
          tokens.push({ chord: pendingChord, lyric: match[2] });
          pendingChord = null;
        }
      }
      if (pendingChord) tokens.push({ chord: pendingChord, lyric: '' });

      if (tokens.length > 0) {
        let lineHtml = '<div style="display:flex;flex-wrap:wrap;margin-bottom:6px;line-height:1.2;">';
        for (const t of tokens) {
          const chordStr = t.chord ? '<span style="font-weight:700;font-size:11px;color:#b45309;min-height:14px;display:block;">' + t.chord + '</span>' : '<span style="min-height:14px;display:block;">&nbsp;</span>';
          const lyricStr = '<span style="font-size:13px;color:#111827;white-space:pre;">' + (t.lyric || ' ') + '</span>';
          lineHtml += '<div style="display:inline-flex;flex-direction:column;align-items:flex-start;">' + chordStr + lyricStr + '</div>';
        }
        lineHtml += '</div>';
        bodyHtml += lineHtml;
      } else {
        bodyHtml += '<div style="margin-bottom:6px;font-size:13px;color:#111827;">' + line + '</div>';
      }
    }

    flushTab();

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + (subtitle ? ' - ' + subtitle : '') + ' (Chord Chart)</title><style>@page{size:letter portrait;margin:15mm;}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827;margin:0;padding:20px;font-size:13px;}@media print{body{padding:0;}.no-print{display:none!important;}}</style></head><body><div class="no-print" style="background:#fef3c7;border:1px solid #fde68a;padding:12px 16px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;"><div><strong>PDF Print Preview</strong> — In print dialog, choose <em>Destination: Save as PDF</em>.</div><button onclick="window.print()" style="background:#059669;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;">🖨️ Save as PDF</button></div><div style="border-bottom:2px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px;"><h1 style="margin:0 0 4px 0;font-size:24px;font-weight:800;color:#111827;">' + title + '</h1>' + (subtitle ? '<h2 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#4b5563;">' + subtitle + '</h2>' : '') + (metaItems.length > 0 ? '<div style="font-size:11px;color:#6b7280;">' + metaItems.join(' &nbsp;·&nbsp; ') + '</div>' : '') + '</div>' + bodyHtml + '<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script></body></html>';
  }

  // Inject floating button when page is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createFloatingButton();
  } else {
    window.addEventListener('DOMContentLoaded', createFloatingButton);
  }
})();
