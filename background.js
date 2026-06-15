// Background service worker: relays toolbar-toggle requests to the active tab.
// The content script is always present (it reapplies saved edits on load);
// these events just show/hide the editor toolbar.

function toggleInTab(tabId) {
  if (tabId == null) return;
  chrome.tabs.sendMessage(tabId, { type: "VISBUG_TOGGLE_TOOLBAR" }).catch(() => {
    // No content script in this tab (e.g. chrome:// pages) — ignore.
  });
}

chrome.action.onClicked.addListener((tab) => toggleInTab(tab.id));

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-editor") toggleInTab(tab?.id);
});
