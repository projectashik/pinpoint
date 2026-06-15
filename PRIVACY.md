# Privacy Policy — PinPoint Editor

_Last updated: 2026-06-15_

PinPoint Editor is a browser extension for visually editing web pages. This
policy explains exactly what it does with data.

## Summary

**PinPoint Editor does not collect, transmit, sell, or share any user data.**
Everything the extension stores stays on your own device.

## What the extension stores

When you edit a page (change text, font size, or an element's position), those
edits are saved **locally** in your browser using the standard
`chrome.storage.local` API, keyed by the page's address. This is what allows
your edits to reappear after you reload the page, and to be turned off or
cleared by you at any time.

This data:

- never leaves your device;
- is never sent to the developer or any third party;
- is not used for analytics, advertising, profiling, or any other purpose;
- can be removed at any time using the extension's "Clear" button, or by
  removing the extension.

## What the extension accesses

To let you edit whatever page you are viewing, the extension runs on the pages
you choose to edit (host access to all sites). It only reads and modifies page
content for the sole purpose of the editing features you trigger. It does **not**
read your browsing history, monitor your activity in the background, or make any
network requests.

## No remote code

The extension contains no remote code. All JavaScript runs from within the
extension package; nothing is fetched or evaluated from external sources.

## Contact

Questions or concerns: https://github.com/projectashik/pinpoint/issues
