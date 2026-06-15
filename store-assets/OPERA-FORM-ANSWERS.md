# Opera Add-ons — form answers (copy & paste)

## Left column

**Service website URL** → _leave blank_
(This is only for a service the extension connects to — not GitHub/blogs. PinPoint connects to no external service.)

**Extension support page URL**
https://github.com/projectashik/pinpoint/issues

**Extension source code URL (public)**
https://github.com/projectashik/pinpoint

**Extension source code URL (required only for Opera moderators)** → _leave blank_
(Only required if the code is minified/merged. PinPoint ships unminified, readable source — not needed.)

**Build instructions**
No build step is required. The extension is plain JavaScript, CSS, JSON, and PNG icons; the published package is the source code as-is.
1. OS: any (developed on macOS, Darwin 25.4).
2. Tools: none required — no bundler, transpiler, or package manager. (Optional: a zip utility to repackage; Python 3 only if regenerating the icons.)
3. Steps:
   - git clone https://github.com/projectashik/pinpoint
   - cd pinpoint
   - ./build.sh   (or: zip -r pinpoint-editor.zip manifest.json background.js content.js content.css icons)
The resulting zip is byte-for-byte the uploaded package.

## Right column

**License URL**
https://github.com/projectashik/pinpoint/blob/main/LICENSE

**Full license text** → (you can use the URL above instead; full text:)
MIT License — Copyright (c) 2026 Ashik Chapagain. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**Privacy policy URL**
https://github.com/projectashik/pinpoint/blob/main/PRIVACY.md

**Full privacy policy text** → (you can use the URL above instead; short form:)
PinPoint Editor does not collect, transmit, sell, or share any user data. When you edit a page (text, font size, or element position), those edits are saved locally in your browser via chrome.storage.local, keyed by the page address, so they reappear after a reload and can be turned off or cleared by you at any time. This data never leaves your device, is never sent to the developer or any third party, and is not used for analytics, advertising, or profiling. To perform edits, the extension runs only on pages you choose to edit; it does not read your browsing history, monitor background activity, or make any network requests. The extension contains no remote code. Contact: https://github.com/projectashik/pinpoint/issues
