# Ultimate Guitar to ChordPro Converter

A Google Chrome Extension (Manifest V3) and companion Web Studio that converts any chord sheet or tab on [Ultimate Guitar](https://tabs.ultimate-guitar.com/) into standard [ChordPro](https://www.chordpro.org/chordpro/) format (`.cho`).

![ChordPro Extension Pop-up](docs/extension_popup_mockup.jpg)

---

## Chrome Extension Setup (Manifest V3)

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Toggle ON **Developer mode** in the upper right corner.
3. Click **Load unpacked** (top-left).
4. Select the project directory:
   ```
   /Volumes/908SSD/Projects/AI/chordpro
   ```
5. Visit any song on [tabs.ultimate-guitar.com](https://tabs.ultimate-guitar.com/) (e.g. *Hallelujah*, *Let It Be*, *Wonderwall*).
6. Click the floating **`♫ ChordPro`** button on the page or the extension icon in your Chrome toolbar to view, transpose, copy, or download the `.cho` sheet!

For full documentation, see [USER_GUIDE.md](USER_GUIDE.md).

---

## Project Files

- **`manifest.json`**: Chrome Extension Manifest V3 configuration for `https://tabs.ultimate-guitar.com/*`.
- **`content.js`**: Content script that injects the floating `♫ ChordPro` button and in-page modal.
- **`popup.html` & `popup.js`**: Extension toolbar pop-up window with live ChordPro viewer, copy, and download.
- **`converter.js`**: JavaScript conversion engine handling `[ch]` tags, chord-over-lyric alignment, and directives.
- **`icon16.png`, `icon48.png`, `icon128.png`**: Extension icons with transparent backgrounds.
- **`USER_GUIDE.md`**: Detailed user guide with step-by-step instructions and pop-up screen grab.
- **`sample_hallelujah.txt`**: Sample plain-text tab with chords spaced above lyrics.

---

## Features

- **Artist as ChordPro Subtitle**: Automatically extracts the artist name directly from the Ultimate Guitar URL (e.g. `https://tabs.ultimate-guitar.com/tab/blind-faith/...` -> `Blind Faith`), replacing dashes with spaces and capitalizing each word, and emits `{subtitle: Artist}` directly below `{title: ...}` adhering to the ChordPro specification.
- **Automatic Metadata Extraction**: Title, Artist (Subtitle), Key, Capo, Tempo, and Tuning.
- **Format Support**:
  - Ultimate Guitar `[ch]...[/ch]` tags
  - ASCII guitar tab blocks (`[tab]...[/tab]` and `e|---`, `B|---` staves)
  - Plain-text tabs where chords are aligned above lyrics
  - Chord fingering diagram blocks (`C/G 3 x 2 0 1 0`, `D/C 8x777x`) formatted in monospace
- **Standard Directives**: Generates `{title}`, `{subtitle}`, `{key}`, `{capo}`, `{start_of_verse}`, `{end_of_verse}`, `{start_of_chorus}`, `{end_of_chorus}`, `{start_of_tab}`, `{end_of_tab}`.
- **Transposition**: Transpose chords up and down semitones on the fly.
- **Musician Export**: Download standard `.cho` ChordPro files or copy to clipboard for OnSong, SongBook, and ChordPro CLI.
