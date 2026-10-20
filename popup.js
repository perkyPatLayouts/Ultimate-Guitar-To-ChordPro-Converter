/**
 * Popup script for Chrome extension
 */

let currentContent = '';
let currentMetadata = { title: '', artist: '' };
let currentTranspose = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes('tabs.ultimate-guitar.com')) {
    document.getElementById('fallbackView').style.display = 'block';
    document.getElementById('songInfo').innerText = 'Not on Ultimate Guitar';
    return;
  }

  // Ask content script for tab data
  try {
    chrome.tabs.sendMessage(tab.id, { action: 'extract_tab' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.data || !response.data.content) {
        // Fallback: inject extraction script
        executeScriptFallback(tab.id);
      } else {
        initConverter(response.data);
      }
    });
  } catch (err) {
    executeScriptFallback(tab.id);
  }
});

function executeScriptFallback(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      return window.UG2ChordPro ? window.UG2ChordPro.extractFromDOM(document) : null;
    }
  }, (results) => {
    if (results && results[0] && results[0].result && results[0].result.content) {
      initConverter(results[0].result);
    } else {
      document.getElementById('fallbackView').style.display = 'block';
      document.getElementById('songInfo').innerText = 'Tab data not found';
    }
  });
}

function initConverter(data) {
  currentContent = data.content;
  currentMetadata = data.metadata || {};

  document.getElementById('fallbackView').style.display = 'none';
  document.getElementById('converterView').style.display = 'block';

  document.getElementById('songInfo').innerText = `${currentMetadata.title || 'Tab'} · ${currentMetadata.artist || 'Unknown'}`;

  updateView();

  document.getElementById('transDown').onclick = () => { currentTranspose--; updateView(); };
  document.getElementById('transUp').onclick = () => { currentTranspose++; updateView(); };

  document.getElementById('btnCopy').onclick = () => {
    const text = document.getElementById('output').value;
    navigator.clipboard.writeText(text);
    const btn = document.getElementById('btnCopy');
    btn.innerText = '✓ Copied!';
    setTimeout(() => { btn.innerText = '📋 Copy'; }, 2000);
  };

  document.getElementById('btnPdf').onclick = () => {
    const text = document.getElementById('output').value;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(renderPrintableChordChart(text));
      printWin.document.close();
    }
  };

  document.getElementById('btnDownload').onclick = () => {
    const text = document.getElementById('output').value;
    const filename = ((currentMetadata.title || 'song') + '.cho').toLowerCase().replace(/[^a-z0-9.]+/g, '_');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };
}

function updateView() {
  const result = window.UG2ChordPro.convert(currentContent, {
    metadata: currentMetadata,
    transposeSemitones: currentTranspose,
    useShortDirectives: false,
    useSectionEnvironments: true,
    includeMetaHeader: true,
  });

  document.getElementById('output').value = result.chordpro;
  document.getElementById('transVal').innerText = (currentTranspose > 0 ? '+' : '') + currentTranspose;
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
