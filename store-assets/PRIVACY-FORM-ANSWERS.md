# Chrome Web Store — Privacy tab answers (copy & paste)

> ⚠️ First re-upload the **rebuilt `pinpoint-editor.zip`**. It now requests only
> `storage` (plus host access). The `activeTab` and `scripting` permissions were
> removed because they weren't used — so those two justification boxes will
> disappear from this form, and you avoid an "unnecessary permission" rejection.

---

## Single purpose description
PinPoint Editor lets users visually edit any web page in place: inspect an element's fonts, edit its text, drag it to a new position, and change its font size with the arrow keys. Every edit is saved locally for that page and re-applied automatically when the page is reloaded, until the user disables or clears it. Visual in-page editing is the extension's only purpose.

## storage justification
The "storage" permission saves the user's own edits — changed text, font sizes, and element positions — locally via chrome.storage.local, keyed by the page's URL. This is the core feature: it lets the edits persist across page reloads and lets the user temporarily disable them or clear them. No data is transmitted; storage stays in the user's browser on their device.

## Host permission justification (`<all_urls>`)
The extension's purpose is to let users edit whatever page they are currently viewing, so it must be able to run its in-page editing toolbar on any site the user opens. The content script runs on all URLs to (1) display the editor when the user activates it (toolbar icon or Alt+Shift+V) and (2) re-apply the user's previously saved edits for that page after a reload. It acts only on pages the user actively edits, makes no network requests, and transmits no data.

## Are you using remote code?
**No, I am not using Remote code.**
(All JavaScript is bundled in the extension package; no external scripts, modules, or eval of remote strings.)

---

## Data usage — what user data do you collect?
**Check NOTHING.**
All page content the extension touches is processed locally to perform the edits
you trigger and is stored only on your device via chrome.storage.local. Nothing
is collected or transmitted off the device, so no data-type box applies.

## Certifications (check all three — all true)
- ✅ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ✅ I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Privacy policy URL
https://github.com/projectashik/pinpoint/blob/main/PRIVACY.md

---

### If you keep the OLD zip (with activeTab + scripting) instead — fallback text
You should remove them, but if you must justify them:
- **activeTab:** Used so that when the user clicks the toolbar icon or presses the keyboard shortcut, the extension can message the current tab to show or hide its editor toolbar.
- **scripting:** (Not actually used by the extension — please remove it from the manifest rather than justifying it.)
