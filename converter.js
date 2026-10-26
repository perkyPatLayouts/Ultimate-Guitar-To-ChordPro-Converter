/**
 * Vanilla JavaScript Converter for Chrome Extension
 * Spec: https://www.chordpro.org/chordpro/
 */

(function (root, factory) {
  const res = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = res;
  }
  if (root) {
    root.UG2ChordPro = res;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {

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

  const CHORD_REGEX = /^[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|\+|sus|add|[0-9]+|ø|o|°)?(?:[0-9]{1,2}|maj[0-9]{1,2}|min[0-9]{1,2}|m[0-9]{1,2}|6\/9)?(?:(?:#|b)[0-9]{1,2}|alt|sus[24]?|add[0-9]+|no[0-9]+)*(?:\/[A-G](?:#|b)?)?\*?$/i;

  function isChordToken(token) {
    if (!token) return false;
    const clean = token.replace(/^[\(\[\{]+/, '').replace(/[\)\]\},.:;!?]+$/, '').trim();
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
    return (chordCount / tokens.length) >= 0.6;
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
    return chord.replace(/([A-G](?:b|#)?)/g, function (match, p1, offset, string) {
      if (offset !== 0 && string[offset - 1] !== '/') {
        return match;
      }
      const current = SEMITONES[match];
      if (current === undefined) return match;
      const target = ((current + semitones) % 12 + 12) % 12;
      return preferFlats ? FLATS[target] : SHARPS[target];
    });
  }

  function weaveChordsIntoLyrics(chords, lyrics, transpose) {
    if (!chords || chords.length === 0) return lyrics;
    const L = lyrics.length;
    const inlineChords = chords.filter(function (c) { return c.index < L; }).sort(function (a, b) { return b.index - a.index; });
    const trailingChords = chords.filter(function (c) { return c.index >= L; }).sort(function (a, b) { return a.index - b.index; });

    let woven = lyrics;
    for (let cIdx = 0; cIdx < inlineChords.length; cIdx++) {
      const c = inlineChords[cIdx];
      const bracket = '[' + transposeChord(c.chord, transpose) + ']';
      woven = woven.slice(0, c.index) + bracket + woven.slice(c.index);
    }
    for (let tIdx = 0; tIdx < trailingChords.length; tIdx++) {
      const tc = trailingChords[tIdx];
      woven += ' [' + transposeChord(tc.chord, transpose) + ']';
    }
    return woven;
  }

  function formatArtistFromSlug(slug) {
    if (!slug) return '';
    return slug
      .replace(/[-_]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map(function (w) {
        return w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '';
      })
      .join(' ');
  }

  function extractArtistFromUrl(url) {
    if (!url) return '';
    try {
      const match = url.match(/\/tab\/([^\/?#]+)/i);
      if (match && match[1]) {
        return formatArtistFromSlug(decodeURIComponent(match[1]));
      }
    } catch (e) {
      const match = url.match(/\/tab\/([^\/?#]+)/i);
      if (match && match[1]) {
        return formatArtistFromSlug(match[1]);
      }
    }
    return '';
  }

  function extractTitleFromUrl(url) {
    if (!url) return '';
    try {
      const match = url.match(/\/tab\/[^\/?#]+\/([^\/?#]+)/i);
      if (match && match[1]) {
        let raw = decodeURIComponent(match[1]);
        raw = raw.replace(/-(?:chords|tab|tabs|bass|ukulele|pro)(?:-\d+)?$/i, '');
        raw = raw.replace(/-\d+$/, '');
        return formatArtistFromSlug(raw);
      }
    } catch (e) {
      // Ignore
    }
    return '';
  }

  function decodeHTMLEntities(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function extractFromDOM(doc, url) {
    const pageUrl = url || (doc && doc.location && doc.location.href) || (typeof window !== 'undefined' && window.location && window.location.href) || '';
    const meta = { title: '', artist: '', key: '', capo: '', tempo: '', tuning: '', url: pageUrl };
    let rawContent = '';

    // If URL is available, extract artist immediately from URL slug (e.g. /tab/blind-faith/...)
    const artistFromUrl = extractArtistFromUrl(pageUrl);
    if (artistFromUrl) {
      meta.artist = artistFromUrl;
    }

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
            // If URL-based artist not yet found, use tab.artist_name and format it
            if (!meta.artist && pageData.tab.artist_name) {
              meta.artist = formatArtistFromSlug(pageData.tab.artist_name);
            }
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

    // 2. Fallback to DOM elements or URL
    if (!meta.title) {
      const h1 = doc.querySelector('h1');
      if (h1) {
        meta.title = h1.innerText.replace(/chords/i, '').replace(/tab/i, '').trim();
      }
      if (!meta.title && pageUrl) {
        meta.title = extractTitleFromUrl(pageUrl);
      }
    }

    if (!meta.artist && pageUrl) {
      meta.artist = extractArtistFromUrl(pageUrl);
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

    let content = input || '';
    let meta = options.metadata || { title: '', artist: '' };

    // Extract artist and title from URL if provided or present in input
    const urlFromOptions = options.url || meta.url || '';
    let artistFromUrl = extractArtistFromUrl(urlFromOptions);
    let titleFromUrl = extractTitleFromUrl(urlFromOptions);

    if (typeof content === 'string') {
      const urlInContent = content.match(/https?:\/\/tabs\.ultimate-guitar\.com\/tab\/[^\s"')]+/i);
      if (urlInContent) {
        if (!artistFromUrl) artistFromUrl = extractArtistFromUrl(urlInContent[0]);
        if (!titleFromUrl) titleFromUrl = extractTitleFromUrl(urlInContent[0]);
      }
    }

    let finalArtist = options.customArtist || artistFromUrl || meta.artist || '';
    if (finalArtist) {
      finalArtist = formatArtistFromSlug(finalArtist);
    }

    let finalTitle = options.customTitle || (meta.title && meta.title !== 'Untitled Song' ? meta.title : '') || titleFromUrl || '';

    // Fallback: check first two non-empty lines for title and artist if they are plain text headers
    const rawFirstLines = content.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!finalTitle && rawFirstLines.length > 0 && !isChordLine(rawFirstLines[0]) && !rawFirstLines[0].startsWith('[') && !rawFirstLines[0].startsWith('{') && !isChordFingeringLine(rawFirstLines[0])) {
      finalTitle = rawFirstLines[0];
    }
    if (!finalArtist && rawFirstLines.length > 1 && !isChordLine(rawFirstLines[1]) && !rawFirstLines[1].startsWith('[') && !rawFirstLines[1].startsWith('{') && !isChordFingeringLine(rawFirstLines[1])) {
      finalArtist = formatArtistFromSlug(rawFirstLines[1]);
    }

    if (!finalTitle) {
      finalTitle = 'Untitled Song';
    }

    // Directives builder
    function d(longName, shortName, val) {
      const name = useShort ? shortName : longName;
      return (val !== undefined && val !== null && val !== '') ? `{${name}: ${val}}` : `{${name}}`;
    }

    // Unwrap [tab]...[/tab] blocks that are just monospace wrappers around chords/lyrics
    content = content.replace(/\[tab\]([\s\S]*?)\[\/tab\]/gi, function (match, inner) {
      const isActualTab = /^[eEaAdDgGbB]\|/m.test(inner)
        || /^\|?[-0-9hpsb\/~xX\|\s]{8,}\|?$/m.test(inner)
        || isChordFingeringLine(inner);
      if (isActualTab) return match;
      return inner;
    });

    const lines = content.split(/\r?\n/);
    const output = [];
    const detectedChords = new Set();

    if (includeHeader) {
      output.push(d('title', 't', finalTitle));

      // Always include artist as subtitle
      if (finalArtist) {
        output.push(d('subtitle', 'st', finalArtist));
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
    // Skip duplicate header lines (title / artist) at start before sections or chords
    const norm = function (s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
    while (i < lines.length) {
      const cl = norm(lines[i]);
      if (!cl || cl === norm(finalTitle) || cl === norm(finalArtist) || cl === norm(meta.title) || cl === norm(meta.artist) || cl === norm(options.customTitle) || cl === norm(options.customArtist)) {
        i++;
      } else {
        break;
      }
    }

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
        const isNextLyrics = nextLine && nextLine.trim() && !nextLine.includes('[ch]') && !isChordLine(nextLine) && !nextLine.trim().startsWith('[') && !/^[eEaAdDgGbB]\|/.test(nextLine.trim());

        if (isPure && isNextLyrics) {
          const woven = weaveChordsIntoLyrics(chords, nextLine, transpose);
          output.push(woven);
          i += 2;
          continue;
        }

        output.push(line.replace(/\[ch\](.*?)\[\/ch\]/g, function (_, c) {
          return '[' + transposeChord(c, transpose) + ']';
        }));
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
        const isNextLyrics = nextLine && nextLine.trim() && !isChordLine(nextLine) && !nextLine.trim().startsWith('[') && !/^[eEaAdDgGbB]\|/.test(nextLine.trim());

        if (isNextLyrics) {
          const woven = weaveChordsIntoLyrics(chords, nextLine, transpose);
          output.push(woven);
          i += 2;
          continue;
        }

        // Standalone chord progression line - preserve original visual spacing
        const chordOnly = line.replace(/\S+/g, function (tok) {
          const clean = tok.replace(/^[\(\[\{]+/, '').replace(/[\)\]\},.:;!?]+$/, '').trim();
          if (isChordToken(clean)) {
            const transposed = transposeChord(clean, transpose);
            detectedChords.add(transposed);
            return '[' + transposed + ']';
          }
          return tok;
        });
        output.push(chordOnly);
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
    formatArtistFromSlug: formatArtistFromSlug,
    extractArtistFromUrl: extractArtistFromUrl,
  };
});

