# Publishing PinPoint Editor

Author: **Ashik Chapagain** · Homepage: <https://github.com/projectashik/pinpoint>

One package — `pinpoint-editor.zip` — is submitted to all three stores.
Rebuild it any time with:

```bash
zip -r pinpoint-editor.zip manifest.json background.js content.js content.css icons -x '*.DS_Store'
```

---

## Assets you must create (not in the repo)

| Asset | Size | Chrome | Edge | Firefox (AMO) |
| --- | --- | :-: | :-: | :-: |
| Store icon | 128×128 (have it: `icons/icon128.png`) | ✅ | ✅ | ✅ |
| Screenshot(s) | **1280×800** or 640×400 | required (1–5) | required (1–10) | required (≥1) |
| Small promo tile | 440×280 | optional | optional | — |
| Marquee promo | 1400×560 | optional | — | — |

> Tip: load the extension, open `demo.html`, press **Alt+Shift+V**, and capture the
> palette + inspector + an edited element at 1280×800 for the main screenshot.

---

## Listing copy (reuse across stores)

- **Name:** PinPoint Editor
- **Summary (≤132 chars):** Visually edit any page: drag elements, edit text, inspect & resize fonts. Edits persist across reloads until you clear them.
- **Category:** Developer Tools
- **Single purpose:** Visually inspect and edit any web page in place, with edits saved per-page until removed.

### Permission justifications
- **`<all_urls>` / host access** — the editor must run on whatever page the user chooses to edit.
- **`storage`** — saves the user's per-page edits **locally** (`chrome.storage.local`); nothing leaves the device.

> The extension requests only `storage` + host access. `activeTab` and
> `scripting` were intentionally **not** requested (unused → avoids rejection).
> Full privacy-tab answers are in `store-assets/PRIVACY-FORM-ANSWERS.md`.

### Privacy
No data collection. No analytics. No network requests. All edits are stored
locally via `chrome.storage.local` and never transmitted.

---

## Per-store steps

### Chrome Web Store — <https://chrome.google.com/webstore/devconsole>
1. One-time **$5** developer registration (first submission only).
2. New item → upload `pinpoint-editor.zip`.
3. Fill listing + screenshots + privacy practices ("does not collect user data").
4. A warning about the unrecognized `background.scripts` key is expected (the
   cross-browser fallback) and does not block review.

### Microsoft Edge Add-ons — <https://partner.microsoft.com/dashboard/microsoftedge>
1. Free developer account.
2. New extension → upload the **same** `pinpoint-editor.zip`.
3. Reuse the listing copy + screenshots above.

### Firefox Add-ons (AMO) — <https://addons.mozilla.org/developers/>
1. Free developer account.
2. Submit `pinpoint-editor.zip`. AMO uses `browser_specific_settings.gecko.id`
   (`pinpoint-editor@superlabs.co`) and `strict_min_version` `121.0`.
3. Expect extra review scrutiny on `<all_urls>` + broad content-script match —
   the justifications above cover it. Source upload isn't required (no build step).

---

## Pre-submit checklist
- [ ] Bump `version` in `manifest.json` if re-submitting.
- [ ] `pinpoint-editor.zip` rebuilt from the latest files.
- [ ] At least one 1280×800 screenshot per store.
- [ ] Privacy = "no data collected" selected on each store.
- [ ] Tested loaded unpacked on Chrome/Edge **and** Firefox (`about:debugging`).
