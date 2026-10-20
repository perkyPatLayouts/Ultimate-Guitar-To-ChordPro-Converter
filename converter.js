/**
 * Vanilla JavaScript Converter for Chrome Extension
 * Spec: https://www.chordpro.org/chordpro/
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UG2ChordPro = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const SEMITONES = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
  };

  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const CHORD_REGEX = /^[A-G](?:b|#)?(?:m|min|maj|M|dim|aug|sus|sus2|sus4|add[0-9]|add9|add11|[0-9]{1,2}|M7|maj7|min7|m7|m6|6|7|9|11|13|7sus4|7b5|7#9|7b9|dim7)?(?:\/[A-G](?:b|#)?)?$/;

  function isChordToken(token) {
    if (!token) return false;
    const clean = token.replace(/^[\(\[\{]/, '').replace(/[\)\]\},.:;!?]$/, '').trim();
    if (!clean) return false;

    const stopwords = new Set(['A', 'I', 'AM', 'AN', 'AT', 'BE', 'BY', 'DO', 'HE', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE']);
    if (stopwords.has(clean.toUpperCase()) && clean.length <= 2 && clean === clean.toUpperCase()) {
      if (clean === 'A' || clean === 'Am') return true;
      return false;
    }

    return CHORD_REGEX.test(clean);
  }

  function isChordLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;

    if (/^\[(Intro|Verse|Chorus|Bridge|Solo|Outro|Pre-Chorus|Interlude|Hook|Refrain)/i.test(trimmed)) return false;
    if (/^[eEaAdDgGbB]\|/.test(trimmed) || /^[0-9|\/\\-]{6,}$/.test(trimmed)) return false;

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (!tokens.length) return false;

    let chordCount = 0;
    for (const t of tokens) {
      if (isChordToken(t)) chordCount++;
    }

    if (tokens.length <= 2) return chordCount === tokens.length;
    return (chordCount / tokens.length) >= 0.7;
  }

  function isChordFingeringLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[') || trimmed.startsWith('{')) return false;
    if (/^[eEaAdDgGbB]\|/.test(trimmed)) return false;

    // 1. Compact 6-fret notation: e.g. "D/C 8x777x", "D/Bb 6x777x", "Em 022000"
    if (/^([A-Ga-g][#b]?[A-Za-z0-9#b\/*+()_-]*)\s+([0-9xX]{6})(?:\s+.*)?$/.test(trimmed)) return true;

    // 2. Spaced 6-fret notation: e.g. "C/G 3 x 2 0 1 0", "Csus2/B x 2 0 0 1 x", "G7/F 1 x 0 0 x x (no 3)"
    if (/^([A-Ga-g][#b]?[A-Za-z0-9#b\/*+()_-]*)\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])(?:\s+.*)?$/.test(trimmed)) return true;

    // 3. Hyphen-separated 6-fret notation: e.g. "G 3-2-0-0-0-3", "Am x-0-2-2-1-0"
    if (/^([A-Ga-g][#b]?[A-Za-z0-9#b\/*+()_-]*)\s+([0-9]{1,2}|[xX])-([0-9]{1,2}|[xX])-([0-9]{1,2}|[xX])-([0-9]{1,2}|[xX])-([0-9]{1,2}|[xX])-([0-9]{1,2}|[xX])(?:\s+.*)?$/.test(trimmed)) return true;

    // 4. 4-string notation (Ukulele/Bass): e.g. "C 0 0 0 3"
    if (/^([A-Ga-g][#b]?[A-Za-z0-9#b\/*+()_-]*)\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])\s+([0-9]{1,2}|[xX])(?:\s+.*)?$/.test(trimmed)) return true;

    return false;
  }

  function isChordDiagramHeaderLine(line) {
    const trimmed = line.trim();
    if (/^(?:strings?:?\s*)?(?:[eE]\s+[aA]\s+[dD]\s+[gG]\s+[bB]\s+[eE]|[eE]\s+[bB]\s+[gG]\s+[dD]\s+[aA]\s+[eE]|[eE]-[aA]-[dD]-[gG]-[bB]-[eE])$/i.test(trimmed)) return true;
    if (/^(?:chords?(?:\s+used|\s+definitions|\s+diagrams)?):?$/i.test(trimmed)) return true;
    return false;
  }

  function transposeChord(chord, semitones, preferFlats) {
    if (!semitones) return chord;
    return chord.replace(/([A-G](?:b|#)?)/g, function (match) {
      const current = SEMITONES[match];
      if (current === undefined) return match;
      const target = ((current + semitones) % 12 + 12) % 12;
      return preferFlats ? FLATS[target] : SHARPS[target];
    });
  }

  function decodeHTMLEntities(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function extractFromDOM(doc) {
    const meta = { title: '', artist: '', key: '', capo: '', tempo: '', tuning: '' };
    let rawContent = '';

    // 1. Look for .js-store
    const jsStore = doc.querySelector('.js-store');
    if (jsStore && jsStore.getAttribute('data-content')) {
      try {
        const rawJson = jsStore.getAttribute('data-content');
        const data = JSON.parse(rawJson);
        const pageData = data?.store?.page?.data;
        if (pageData) {
          if (pageData.tab) {
            meta.title = pageData.tab.song_name || '';
            meta.artist = pageData.tab.artist_name || '';
          }
          if (pageData.tab_view) {
            rawContent = pageData.tab_view.wiki_tab?.content || '';
            const m = pageData.tab_view.meta || {};
            if (m.key) meta.key = m.key;
            if (m.capo) meta.capo = String(m.capo);
            if (m.tempo) meta.tempo = String(m.tempo);
            if (m.tuning?.value) meta.tuning = m.tuning.value;
          }
        }
      } catch (e) {
        console.warn('Could not parse js-store JSON', e);
      }
    }

    // 2. Fallback to DOM elements
    if (!meta.title) {
      const h1 = doc.querySelector('h1');
      if (h1) meta.title = h1.innerText.replace(/chords/i, '').replace(/tab/i, '').trim();
    }

    if (!rawContent) {
      const pre = doc.querySelector('pre');
      if (pre) {
        rawContent = pre.innerText;
      }
    }

    return { content: rawContent, metadata: meta };
  }

  function convert(input, options) {
    options = options || {};
    const useShort = !!options.useShortDirectives;
    const useSections = options.useSectionEnvironments !== false;
    const transpose = Number(options.transposeSemitones) || 0;
    const includeHeader = options.includeMetaHeader !== false;
    const stripTabs = !!options.stripTabStaves;

    let content = input;
    let meta = options.metadata || { title: 'Untitled Song', artist: 'Unknown Artist' };

    // Directives builder
    function d(longName, shortName, val) {
      const name = useShort ? shortName : longName;
      return (val !== undefined && val !== null && val !== '') ? `{${name}: ${val}}` : `{${name}}`;
    }

    const lines = content.split(/\r?\n/);
    const output = [];
    const detectedChords = new Set();

    if (includeHeader) {
      if (meta.title) output.push(d('title', 't', meta.title));
      const artistName = options.customArtist || meta.artist;
      if (artistName && artistName.trim()) {
        output.push(d('subtitle', 'st', artistName.trim()));
      }
      if (meta.key) {
        const k = transpose ? transposeChord(meta.key, transpose) : meta.key;
        output.push(d('key', 'key', k));
      }
      if (meta.capo) output.push(d('capo', 'capo', meta.capo));
      if (meta.tempo) output.push(d('tempo', 'tempo', meta.tempo));
      if (meta.tuning) output.push(d('tuning', 'tuning', meta.tuning));
      output.push('');
    }

    let inTab = false;
    let currentSection = null;

    function closeSection() {
      if (!currentSection || !useSections) return;
      if (currentSection === 'verse') output.push(d('end_of_verse', 'eov'));
      else if (currentSection === 'chorus') output.push(d('end_of_chorus', 'eoc'));
      else if (currentSection === 'bridge') output.push(d('end_of_bridge', 'eob'));
      currentSection = null;
    }

    let i = 0;
    while (i < lines.length) {
      let line = lines[i];

      // Tab blocks [tab]...[/tab]
      if (line.includes('[tab]')) {
        if (stripTabs) {
          while (i < lines.length && !lines[i].includes('[/tab]')) i++;
          i++;
          continue;
        }
        closeSection();
        output.push(d('start_of_tab', 'sot'));
        inTab = true;
        line = line.replace(/\[tab\]/g, '');
      }

      if (line.includes('[/tab]')) {
        line = line.replace(/\[\/tab\]/g, '');
        if (line.trim()) output.push(line);
        output.push(d('end_of_tab', 'eot'));
        inTab = false;
        i++;
        continue;
      }

      if (inTab) {
        if (!stripTabs) output.push(line);
        i++;
        continue;
      }

      // ASCII tab staves
      if (/^[eEaAdDgGbB]\|[-0-9hpsb\/~xX\|\s]+/.test(line.trim())) {
        if (stripTabs) { i++; continue; }
        closeSection();
        output.push(d('start_of_tab', 'sot'));
        while (i < lines.length && (/^[eEaAdDgGbB]\|/.test(lines[i].trim()) || !lines[i].trim())) {
          output.push(lines[i]);
          i++;
        }
        output.push(d('end_of_tab', 'eot'));
        continue;
      }

      // Check for chord fingering diagram blocks (e.g. C/G 3 x 2 0 1 0 or D/C 8x777x)
      const isHeaderThenFingering = isChordDiagramHeaderLine(line) && lines[i + 1] && isChordFingeringLine(lines[i + 1]);
      if (isChordFingeringLine(line) || isHeaderThenFingering) {
        closeSection();
        output.push(d('start_of_tab', 'sot'));

        if (isHeaderThenFingering) {
          output.push(lines[i]);
          i++;
        }

        while (i < lines.length) {
          const curLine = lines[i];
          if (isChordFingeringLine(curLine)) {
            output.push(curLine);
            i++;
          } else if (curLine.trim() === '' && lines[i + 1] && isChordFingeringLine(lines[i + 1])) {
            output.push(curLine);
            i++;
          } else {
            break;
          }
        }

        output.push(d('end_of_tab', 'eot'));
        continue;
      }

      const trimmed = line.trim();

      // Section markers [Verse 1], [Chorus], etc.
      const secMatch = trimmed.match(/^\[(Intro|Verse(?:\s+\d+)?|Chorus(?:\s+\d+)?|Bridge|Solo|Outro|Pre-Chorus|Interlude|Hook|Refrain)\]/i);
      if (secMatch) {
        const secName = secMatch[1];
        closeSection();
        const lower = secName.toLowerCase();
        if (useSections && lower.startsWith('verse')) {
          output.push(d('start_of_verse', 'sov', secName));
          currentSection = 'verse';
        } else if (useSections && lower.startsWith('chorus')) {
          output.push(d('start_of_chorus', 'soc', secName));
          currentSection = 'chorus';
        } else if (useSections && lower.startsWith('bridge')) {
          output.push(d('start_of_bridge', 'sob', secName));
          currentSection = 'bridge';
        } else {
          output.push(d('comment', 'c', secName));
        }
        i++;
        continue;
      }

      // [ch]...[/ch] tags
      if (line.includes('[ch]')) {
        const chRegex = /\[ch\](.*?)\[\/ch\]/g;
        let match;
        const chords = [];
        let visualLine = '';
        let lastOffset = 0;

        while ((match = chRegex.exec(line)) !== null) {
          visualLine += line.slice(lastOffset, match.index);
          chords.push({ chord: match[1], index: visualLine.length });
          visualLine += match[1];
          lastOffset = match.index + match[0].length;
        }
        visualLine += line.slice(lastOffset);

        chords.forEach(c => detectedChords.add(transposeChord(c.chord, transpose)));

        let rem = visualLine;
        chords.forEach(c => {
          rem = rem.slice(0, c.index) + ' '.repeat(c.chord.length) + rem.slice(c.index + c.chord.length);
        });

        const isPure = rem.trim().length === 0;
        const nextLine = lines[i + 1];
        const isNextLyrics = nextLine && nextLine.trim() && !nextLine.includes('[ch]') && !isChordLine(nextLine) && !nextLine.trim().startsWith('[');

        if (isPure && isNextLyrics) {
          const sorted = chords.sort((a, b) => b.index - a.index);
          let woven = nextLine;
          sorted.forEach(c => {
            const bracket = `[${transposeChord(c.chord, transpose)}]`;
            woven = c.index >= woven.length ? (woven + ' ' + bracket) : (woven.slice(0, c.index) + bracket + woven.slice(c.index));
          });
          output.push(woven);
          i += 2;
          continue;
        }

        output.push(line.replace(/\[ch\](.*?)\[\/ch\]/g, (_, c) => `[${transposeChord(c, transpose)}]`));
        i++;
        continue;
      }

      // Plain chord lines
      if (isChordLine(line)) {
        const tokenRegex = /\S+/g;
        let match;
        const chords = [];
        while ((match = tokenRegex.exec(line)) !== null) {
          if (isChordToken(match[0])) {
            const clean = match[0].replace(/^[\(\[\{]/, '').replace(/[\)\]\},.:;!?]$/, '').trim();
            chords.push({ chord: clean, index: match.index });
            detectedChords.add(transposeChord(clean, transpose));
          }
        }

        const nextLine = lines[i + 1];
        const isNextLyrics = nextLine && nextLine.trim() && !isChordLine(nextLine) && !nextLine.trim().startsWith('[');

        if (isNextLyrics) {
          const sorted = chords.sort((a, b) => b.index - a.index);
          let woven = nextLine;
          sorted.forEach(c => {
            const bracket = `[${transposeChord(c.chord, transpose)}]`;
            woven = c.index >= woven.length ? (woven + ' ' + bracket) : (woven.slice(0, c.index) + bracket + woven.slice(c.index));
          });
          output.push(woven);
          i += 2;
          continue;
        }

        output.push(chords.map(c => `[${transposeChord(c.chord, transpose)}]`).join(' '));
        i++;
        continue;
      }

      output.push(line);
      i++;
    }

    closeSection();

    return {
      chordpro: output.join('\n').trim(),
      metadata: meta,
      detectedChords: Array.from(detectedChords),
    };
  }

  return {
    convert: convert,
    extractFromDOM: extractFromDOM,
    transposeChord: transposeChord,
  };
});
