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
