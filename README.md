# PinPoint Editor

A small Chrome (MV3) extension for visually editing any web page — inspired by [VisBug](https://github.com/GoogleChromeLabs/ProjectVisBug). Hover any element to inspect its font, edit its text, drag it around, and nudge font sizes with the arrow keys — and unlike VisBug, **every edit is saved per-page and survives reloads** until you explicitly clear it.

## Features

- **🔍 Inspect** — hover any element to see its selector, `font-family`, `font-size`, `font-weight`, `line-height`, `color`, and box size.
- **✎ Edit text** — click any element and type to change its text. Press **Enter** or **Esc** to commit (Shift+Enter for a line break). Saved and restored on reload.
- **✥ Move** — drag elements anywhere (applied as a non-destructive CSS `translate`).
- **↑ / ↓ font size** — with an element selected, Arrow Up/Down change its font size. Hold **Shift** for ±10px steps.
- **Persistent state** — edits are stored in `chrome.storage.local`, keyed by the page's `origin + path`. Reload the page and your edits are still there.
- **Enable / Disable toggle** — temporarily revert *all* edits to compare against the original, **without deleting them**. Re-enable to bring them back instantly.
- **Clear saved edits** — permanently remove the saved edits for the current page.
- **⌥ + ⌫ (Alt/Cmd + Delete)** — reset just the selected element.

## Browser support

One codebase runs on all three (Manifest V3). The manifest carries both a
`service_worker` (Chromium) and a `scripts` (Firefox) background entry, plus a
`browser_specific_settings.gecko` block for AMO — each browser uses the part it
understands and ignores the rest.

| Browser | Status |
| --- | --- |
| Chrome | ✅ |
| Edge | ✅ (Chromium — same package) |
| Firefox | ✅ (121+) |

## Install (unpacked)

**Chrome / Edge**
1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json` in this folder.
   (Temporary add-ons are removed on restart; for a permanent install, sign it via AMO.)

Then visit any page and press **Alt + Shift + V** (or click the toolbar icon) to show/hide the editor.

> The content script always loads so it can re-apply your saved edits on reload — the keyboard shortcut / icon only shows or hides the editing **toolbar**.

## How it works

| Concern | Approach |
| --- | --- |
| Identifying an element across reloads | A stable CSS selector (`#id` when unique, otherwise an `:nth-of-type` path). |
| Storing edits | `chrome.storage.local["vbl:<origin><path>"] = { enabled, edits: { selector: {...} } }`. |
| Applying edits | Inline styles set with `!important`; re-applied on load with a few retries for late-rendered content. |
| Disable without deleting | The original inline `style` of every touched element is captured in-session; Disable restores it, Enable re-applies the saved edits. |
| Moving elements | Stored as `translate(x, y)` layered on top of any existing transform — never mutates layout/markup. |

## Try it

The UI is a **vertical icon palette** docked on the left edge (like VisBug), with a flyout inspector panel beside it. Drag the `⠿` grip to reposition it. Close the inspector with its **×** button (or the **ⓘ** tool); it reopens automatically when you select an element.

Open `demo.html` (in this folder) in Chrome with the extension loaded, then:

1. Press **Alt + Shift + V** to show the palette.
2. Click **🔍 Inspect**, hover the heading → see its font info in the panel.
3. Click the heading, press **↑ ↑ ↑** to grow it.
4. Click **✥ Move**, drag the card around.
5. **Reload** — edits persist.
6. Click **⏻** to disable edits and compare with the original, then click it again to re-enable. **🗑** clears saved edits for the page.

## Notes / limits

- Works on a single top-level frame (not cross-origin iframes).
- Selectors assume a reasonably stable DOM; heavily dynamic pages may relocate edits if structure changes.
- Won't run on `chrome://` pages or the Chrome Web Store (browser restriction).
