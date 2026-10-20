# Ultimate Guitar to ChordPro Converter — User's Guide

A Chrome Extension (Manifest V3) and companion Web Studio that converts any song on [Ultimate Guitar](https://tabs.ultimate-guitar.com/) into clean, standard [ChordPro](https://www.chordpro.org/chordpro/) format (`.cho`) with a single click.

---

## Extension Pop-up Preview

Below is a screen grab of the Chrome extension pop-up in action on an Ultimate Guitar tab:

![ChordPro Extension Pop-up](docs/extension_popup_mockup.jpg)

---

## 1. Quick Installation (Google Chrome)

The extension is located in your project folder:
`/Volumes/908SSD/Projects/AI/chordpro`

Follow these 4 steps to install it in Google Chrome:

1. **Open the Extensions Page**:
   In Chrome, navigate to `chrome://extensions/` (or click Chrome menu **⋮** → **Extensions** → **Manage Extensions**).

2. **Enable Developer Mode**:
   Toggle the **Developer mode** switch in the top-right corner to **ON**.

3. **Load the Unpacked Extension**:
   Click the **"Load unpacked"** button in the top-left corner.
   Select your folder:
   ```
   /Volumes/908SSD/Projects/AI/chordpro
   ```
   *(Or select your unzipped extension directory).*

4. **Pin the Extension**:
   Click the puzzle piece icon (Extensions) in your Chrome toolbar next to the address bar, and click the pin icon next to **Ultimate Guitar to ChordPro Converter**.

---

## 2. How to Use on Ultimate Guitar

Once installed, visit any tab or chords page on **[tabs.ultimate-guitar.com](https://tabs.ultimate-guitar.com/)** (for example: *Hallelujah*, *Let It Be*, *Wonderwall*, or *Wish You Were Here*).

You have two convenient ways to convert the song:

### Method A: The In-Page Floating Button
1. Look at the **bottom-right corner** of the Ultimate Guitar tab page.
2. Click the floating **`♫ ChordPro`** button.
3. An overlay dialog appears instantly on your screen containing:
   - Extracted song metadata (Title, Artist, Key, Capo)
   - Transpose controls (`-1` / `+1`)
   - Complete ChordPro markup
   - **Copy** button (copies formatted text to clipboard)
   - **Download .cho** button (saves the file for OnSong, SongBook, or ChordPro CLI)

### Method B: The Chrome Toolbar Pop-up
1. Click the red musical note icon in your Chrome toolbar.
2. The pop-up window opens (as pictured in the screen grab above).
3. The song is automatically read from the active tab and rendered into ChordPro notation.
4. Adjust transposition if needed, then click **Copy** or **Download .cho**.

---

## 3. Key Features

- **Automatic Metadata Extraction**:
  Reads the song title, artist, original key, capo position, tempo (BPM), and guitar tuning directly from Ultimate Guitar's embedded page data.
- **Accurate Chord-over-Lyric Alignment**:
  Seamlessly weaves chord changes directly into the lyric syllables where they occur (`[C]When I [G]find myself...`).
- **Standard Section Directives**:
  Wraps verses in `{start_of_verse}` ... `{end_of_verse}` and choruses in `{start_of_chorus}` ... `{end_of_chorus}`.
- **ASCII Tab Preservation**:
  Detects guitar tablature staves (`e|---`, `B|---`) and encapsulates them within `{start_of_tab}` ... `{end_of_tab}` blocks to preserve monospace formatting.
- **On-the-Fly Transposition**:
  Transpose chords up or down semitones without modifying your original source tab.
- **Zero Cloudflare / Anti-Bot Blocking**:
  Because the extension runs with `activeTab` permissions directly inside your logged-in Chrome browser, it has native access to the rendered DOM without CORS errors.

---

## 4. Extension File Structure

```
/Volumes/908SSD/Projects/AI/chordpro/
├── manifest.json              # Chrome Extension Manifest V3 configuration
├── content.js                 # In-page floating button & DOM reader
├── converter.js               # JavaScript conversion engine
├── popup.html                 # Chrome toolbar popup interface
├── popup.js                   # Popup interactive controller
├── icon16.png                 # 16x16 transparent extension icon
├── icon48.png                 # 48x48 transparent extension icon
├── icon128.png                # 128x128 transparent extension icon
├── README.md                  # Project overview & quick start
├── USER_GUIDE.md              # Complete user's manual (this file)
└── docs/
    └── extension_popup_mockup.jpg # Screenshot of the extension popup
```

---

## 5. Troubleshooting & FAQ

#### The extension says "No Ultimate Guitar tab found on this tab"
Make sure your active tab is on `https://tabs.ultimate-guitar.com/tab/...` and the chords page has finished loading.

#### I updated files in `/Volumes/908SSD/Projects/AI/chordpro`. How do I refresh Chrome?
Go to `chrome://extensions/` and click the circular **Reload** icon on the **Ultimate Guitar to ChordPro Converter** card.

#### Can I import `.cho` files into other musician apps?
Yes! The `.cho` format produced by this extension follows the official [ChordPro Standard](https://www.chordpro.org/chordpro/) and is 100% compatible with OnSong, SongBook, Chord! app, MobileSheets, and the ChordPro CLI.
