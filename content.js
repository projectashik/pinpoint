/* PinPoint Editor — content script
 *
 * Features
 *  - Inspect tool: hover any element to see its font-family / font-size / color / box.
 *  - Move tool: drag elements anywhere (applied as a CSS translate, non-destructive).
 *  - Arrow keys: with an element selected, Up/Down change its font-size
 *    (Shift = ±10px, plain = ±1px).
 *  - Persistence: every edit is saved to chrome.storage.local keyed by this page's
 *    origin+path. On reload the saved edits are re-applied automatically.
 *  - Enable/Disable toggle: temporarily reverts all edits (to compare against the
 *    original) WITHOUT deleting them. Re-enable to bring them back.
 *  - Clear page: permanently removes the saved edits for this page.
 *
 * All of the extension's own UI lives inside #vbl-root and is ignored by the tools.
 */
(() => {
  "use strict";
  if (window.__VBL_LOADED__) return;
  window.__VBL_LOADED__ = true;

  const PAGE_KEY = "vbl:" + location.origin + location.pathname;

  // ---- In-memory state (mirrors what's in storage) -------------------------
  const state = {
    enabled: true, // are saved edits currently applied?
    edits: {}, // selector -> { fontSize, color, translateX, translateY, baseTransform }
  };

  let tool = null; // null | 'inspect' | 'move' | 'text'
  let selectedEl = null;
  let toolbarVisible = false;
  let panelVisible = true; // is the inspector flyout shown?
  let editingText = null; // element currently in contentEditable mode

  // Original inline `style` / text per touched element, so Disable can revert
  // to the natural page and Enable can re-apply. Session-only.
  // WeakMaps hold the values; the Set tracks keys so we can iterate on revert.
  const originalInline = new WeakMap();
  const originalText = new WeakMap();
  const touched = new Set();

  // =========================================================================
  // Storage
  // =========================================================================
  function loadState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(PAGE_KEY, (res) => {
        const saved = res && res[PAGE_KEY];
        if (saved && typeof saved === "object") {
          state.enabled = saved.enabled !== false;
          state.edits = saved.edits || {};
        }
        resolve();
      });
    });
  }

  let saveTimer = null;
  function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      chrome.storage.local.set({ [PAGE_KEY]: { enabled: state.enabled, edits: state.edits } });
    }, 150);
  }

  function clearPage() {
    revertAll();
    state.edits = {};
    selectedEl = null;
    chrome.storage.local.remove(PAGE_KEY);
    refreshUI();
    hideOverlay(selOverlay);
    hideTag(selTag);
  }

  // =========================================================================
  // Selector generation (stable-ish unique CSS path)
  // =========================================================================
  function isUnique(sel) {
    try {
      return document.querySelectorAll(sel).length === 1;
    } catch {
      return false;
    }
  }

  function getSelector(el) {
    if (!(el instanceof Element)) return null;
    if (el.id && isUnique("#" + CSS.escape(el.id))) return "#" + CSS.escape(el.id);

    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      if (node.id && isUnique("#" + CSS.escape(node.id))) {
        parts.unshift("#" + CSS.escape(node.id));
        break;
      }
      let part = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (parent) {
        const sameTag = Array.prototype.filter.call(
          parent.children,
          (c) => c.tagName === node.tagName
        );
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  // =========================================================================
  // Applying / reverting edits
  // =========================================================================
  function captureOriginal(el) {
    if (!originalInline.has(el)) {
      originalInline.set(el, el.getAttribute("style"));
      touched.add(el);
    }
  }

  function captureText(el) {
    if (!originalText.has(el)) {
      originalText.set(el, el.textContent);
      touched.add(el);
    }
  }

  function applyRecord(el, rec) {
    if (rec.text != null) {
      captureText(el);
      if (el.textContent !== rec.text) el.textContent = rec.text;
    }
    captureOriginal(el);
    if (rec.fontSize != null) el.style.setProperty("font-size", rec.fontSize, "important");
    if (rec.color != null) el.style.setProperty("color", rec.color, "important");
    if (rec.translateX || rec.translateY) {
      const base = rec.baseTransform && rec.baseTransform !== "none" ? rec.baseTransform + " " : "";
      el.style.setProperty(
        "transform",
        `${base}translate(${rec.translateX || 0}px, ${rec.translateY || 0}px)`,
        "important"
      );
    }
  }

  function applyAll() {
    for (const sel of Object.keys(state.edits)) {
      const el = document.querySelector(sel);
      if (el) applyRecord(el, state.edits[sel]);
    }
  }

  function revertAll() {
    // Restore each touched element to its pre-edit inline style and text.
    for (const el of liveTouched()) {
      if (originalInline.has(el)) {
        const orig = originalInline.get(el);
        if (orig == null) el.removeAttribute("style");
        else el.setAttribute("style", orig);
      }
      if (originalText.has(el)) el.textContent = originalText.get(el);
    }
  }

  function liveTouched() {
    return Array.from(touched).filter((el) => el.isConnected);
  }

  function setEnabled(on) {
    state.enabled = on;
    if (on) applyAll();
    else {
      revertAll();
      selectedEl = null;
      hideOverlay(selOverlay);
      hideTag(selTag);
    }
    saveState();
    refreshUI();
  }

  // Reapply repeatedly to catch late-rendered content on dynamic pages.
  function applyWithRetries() {
    if (!state.enabled) return;
    applyAll();
    [300, 1000, 2500].forEach((t) => setTimeout(() => state.enabled && applyAll(), t));
  }

  // =========================================================================
  // Editing operations
  // =========================================================================
  function recordFor(el) {
    const sel = getSelector(el);
    if (!sel) return null;
    if (!state.edits[sel]) state.edits[sel] = {};
    return { sel, rec: state.edits[sel] };
  }

  function bumpFontSize(el, delta) {
    const r = recordFor(el);
    if (!r) return;
    const current = parseFloat(getComputedStyle(el).fontSize) || 16;
    const next = Math.max(1, Math.round(current + delta));
    r.rec.fontSize = next + "px";
    applyRecord(el, r.rec);
    saveState();
    showInspector(el);
  }

  function ensureBaseTransform(rec, el) {
    if (rec.baseTransform === undefined) {
      const inline = el.style.transform || "";
      rec.baseTransform = inline; // capture site's own inline transform (if any)
    }
  }

  function moveBy(el, dx, dy) {
    const r = recordFor(el);
    if (!r) return;
    ensureBaseTransform(r.rec, el);
    r.rec.translateX = (r.rec.translateX || 0) + dx;
    r.rec.translateY = (r.rec.translateY || 0) + dy;
    applyRecord(el, r.rec);
    saveState();
  }

  function resetElement(el) {
    if (!el) return;
    const sel = getSelector(el);
    if (sel && state.edits[sel]) delete state.edits[sel];
    if (originalInline.has(el)) {
      const orig = originalInline.get(el);
      if (orig == null) el.removeAttribute("style");
      else el.setAttribute("style", orig);
    }
    if (originalText.has(el)) el.textContent = originalText.get(el);
    saveState();
    showInspector(el);
  }

  // ---- Text editing -------------------------------------------------------
  function startTextEdit(el) {
    if (editingText && editingText !== el) finishTextEdit();
    editingText = el;
    captureText(el);
    el.classList.add("vbl-editing");
    el.setAttribute("contenteditable", "true");
    el.spellcheck = false;
    setTimeout(() => el.focus(), 0);
    el.addEventListener("keydown", onEditKey, true);
    el.addEventListener("blur", finishTextEdit, true);
  }

  function onEditKey(e) {
    // Esc or plain Enter commits; Shift+Enter inserts a line break.
    if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      finishTextEdit();
    }
  }

  function finishTextEdit() {
    const el = editingText;
    if (!el) return;
    editingText = null;
    el.removeEventListener("keydown", onEditKey, true);
    el.removeEventListener("blur", finishTextEdit, true);
    el.removeAttribute("contenteditable");
    el.classList.remove("vbl-editing");

    const r = recordFor(el);
    if (r) {
      const txt = el.textContent;
      if (txt === originalText.get(el)) {
        delete r.rec.text;
        if (Object.keys(r.rec).length === 0) delete state.edits[r.sel];
      } else {
        r.rec.text = txt;
      }
      saveState();
    }
    refreshUI();
    showInspector(el);
    refreshSelectedOverlay();
  }

  // =========================================================================
  // Overlays (hover + selection boxes drawn over the page, never in the DOM)
  // =========================================================================
  let hoverOverlay, selOverlay, hoverTag, selTag;

  function makeOverlay(cls) {
    const d = document.createElement("div");
    d.className = "vbl-overlay" + (cls ? " " + cls : "");
    d.style.display = "none";
    document.documentElement.appendChild(d);
    return d;
  }
  function makeTag() {
    const d = document.createElement("div");
    d.className = "vbl-tag";
    d.style.display = "none";
    document.documentElement.appendChild(d);
    return d;
  }
  function positionOverlay(ov, el) {
    const r = el.getBoundingClientRect();
    ov.style.display = "block";
    ov.style.left = r.left + "px";
    ov.style.top = r.top + "px";
    ov.style.width = r.width + "px";
    ov.style.height = r.height + "px";
  }
  function positionTag(tag, el, text) {
    const r = el.getBoundingClientRect();
    tag.textContent = text;
    tag.style.display = "block";
    const top = r.top - 22 < 0 ? r.top + 4 : r.top - 22;
    tag.style.left = Math.max(2, r.left) + "px";
    tag.style.top = top + "px";
  }
  function hideOverlay(ov) { if (ov) ov.style.display = "none"; }
  function hideTag(t) { if (t) t.style.display = "none"; }

  function tagText(el) {
    const fs = Math.round(parseFloat(getComputedStyle(el).fontSize)) + "px";
    let name = el.tagName.toLowerCase();
    if (el.id) name += "#" + el.id;
    else if (el.classList.length) name += "." + el.classList[0];
    return `${name} · ${fs}`;
  }

  // =========================================================================
  // Inspector panel content
  // =========================================================================
  function showInspector(el) {
    const box = root.querySelector("#vbl-info");
    if (!el) {
      box.innerHTML = '<div class="vbl-info-empty">Hover & click an element to inspect it.</div>';
      return;
    }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const rows = [
      ["selector", getSelector(el), "vbl-sel"],
      ["font-family", cs.fontFamily.split(",")[0].replace(/["']/g, "")],
      ["font-size", cs.fontSize],
      ["font-weight", cs.fontWeight],
      ["line-height", cs.lineHeight],
      ["color", cs.color],
      ["size", `${Math.round(r.width)} × ${Math.round(r.height)}`],
    ];
    box.innerHTML = rows
      .map(
        ([k, v, cls]) =>
          `<div><span class="vbl-k">${k}:</span> <span class="vbl-v ${cls || ""}">${escapeHtml(
            String(v)
          )}</span></div>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // =========================================================================
  // Selection
  // =========================================================================
  function select(el) {
    selectedEl = el;
    positionOverlay(selOverlay, el);
    positionTag(selTag, el, tagText(el));
    if (!panelVisible) setPanelVisible(true); // reopen inspector when something is picked
    showInspector(el);
  }

  function refreshSelectedOverlay() {
    if (selectedEl && selectedEl.isConnected) {
      positionOverlay(selOverlay, selectedEl);
      positionTag(selTag, selectedEl, tagText(selectedEl));
    }
  }

  // =========================================================================
  // Event handling on the page
  // =========================================================================
  function isOurs(node) {
    return node && (node.id === "vbl-root" || (node.closest && node.closest("#vbl-root")));
  }

  let drag = null; // { el, startX, startY }

  function onMouseMove(e) {
    if (!toolbarVisible || !tool) return;

    if (drag) {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      moveBy(drag.el, dx, dy);
      refreshSelectedOverlay();
      return;
    }

    if (editingText) {
      hideOverlay(hoverOverlay);
      hideTag(hoverTag);
      return;
    }

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOurs(el)) {
      hideOverlay(hoverOverlay);
      hideTag(hoverTag);
      return;
    }
    if (el !== selectedEl) {
      positionOverlay(hoverOverlay, el);
      positionTag(hoverTag, el, tagText(el));
    } else {
      hideOverlay(hoverOverlay);
      hideTag(hoverTag);
    }
  }

  function onMouseDown(e) {
    if (!toolbarVisible || !tool || !state.enabled) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOurs(el)) return;

    // Text tool: let the click through so the caret lands where clicked.
    if (tool === "text") {
      if (editingText === el) return;
      select(el);
      startTextEdit(el);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    select(el);

    if (tool === "move") {
      drag = { el, lastX: e.clientX, lastY: e.clientY };
      document.body.classList.add("vbl-grabbing");
    }
  }

  function onMouseUp() {
    if (drag) {
      document.body.classList.remove("vbl-grabbing");
      drag = null;
    }
  }

  // Capture-phase click swallower so selecting/moving never triggers page links.
  function onClickCapture(e) {
    if (!toolbarVisible || !tool) return;
    if (tool === "text") return; // allow clicks for caret placement while editing
    if (isOurs(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onKeyDown(e) {
    if (!toolbarVisible) return;
    // Don't hijack typing.
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable)) return;

    if (e.key === "Escape") {
      if (selectedEl) {
        selectedEl = null;
        hideOverlay(selOverlay);
        hideTag(selTag);
        showInspector(null);
      } else {
        setTool(null);
      }
      return;
    }

    if (!selectedEl || !state.enabled) return;

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
      bumpFontSize(selectedEl, step);
      refreshSelectedOverlay();
    } else if ((e.key === "Backspace" || e.key === "Delete") && (e.metaKey || e.altKey)) {
      // Alt/Cmd + Delete resets the selected element's edits.
      e.preventDefault();
      resetElement(selectedEl);
      refreshSelectedOverlay();
    }
  }

  window.addEventListener("scroll", () => { refreshSelectedOverlay(); }, true);
  window.addEventListener("resize", () => {
    refreshSelectedOverlay();
    if (toolbarVisible) positionPanel();
  });

  // =========================================================================
  // Toolbar UI
  // =========================================================================
  let root;

  function buildToolbar() {
    root = document.createElement("div");
    root.id = "vbl-root";
    root.innerHTML = `
      <div class="vbl-bar" id="vbl-bar">
        <div class="vbl-grip" id="vbl-grip" title="Drag to move">⠿</div>
        <button class="vbl-tool" data-tool="inspect" id="vbl-inspect" data-tip="Inspect — hover for fonts">🔍</button>
        <button class="vbl-tool" data-tool="text" id="vbl-text" data-tip="Edit text — click & type">✎</button>
        <button class="vbl-tool" data-tool="move" id="vbl-move" data-tip="Move — drag elements">✥</button>
        <div class="vbl-divider"></div>
        <button class="vbl-tool vbl-tool--toggle" id="vbl-toggle">⏻<span class="vbl-badge" id="vbl-badge"></span></button>
        <button class="vbl-tool vbl-tool--danger" id="vbl-clear" data-tip="Clear saved edits">🗑</button>
        <button class="vbl-tool" id="vbl-info-toggle" data-tip="Show / hide inspector">ⓘ</button>
        <div class="vbl-divider"></div>
        <button class="vbl-tool" id="vbl-close" data-tip="Hide (Alt+Shift+V)">✕</button>
      </div>

      <div class="vbl-panel" id="vbl-panel">
        <div class="vbl-panel-title">
          <span class="vbl-logo"></span>PinPoint&nbsp;Editor
          <button class="vbl-panel-close" id="vbl-panel-close" title="Close inspector">×</button>
        </div>
        <div class="vbl-info" id="vbl-info"></div>
        <div class="vbl-hint">
          <kbd>↑</kbd><kbd>↓</kbd> font size (<kbd>⇧</kbd> = ±10) ·
          ✎ click to edit text (<kbd>Enter</kbd>/<kbd>Esc</kbd> to commit) ·
          drag with Move tool · <kbd>Esc</kbd> deselect ·
          <kbd>⌥</kbd><kbd>⌫</kbd> reset element
        </div>
        <div class="vbl-status">
          <span class="vbl-dot" id="vbl-dot"></span>
          <span id="vbl-status-text"></span>
        </div>
      </div>
    `;
    document.documentElement.appendChild(root);

    root.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-tool");
        setTool(tool === t ? null : t);
      });
    });
    root.querySelector("#vbl-close").addEventListener("click", () => setToolbarVisible(false));
    root.querySelector("#vbl-toggle").addEventListener("click", () => setEnabled(!state.enabled));
    root.querySelector("#vbl-clear").addEventListener("click", () => {
      if (Object.keys(state.edits).length === 0) return;
      clearPage();
    });
    root.querySelector("#vbl-panel-close").addEventListener("click", () => setPanelVisible(false));
    root.querySelector("#vbl-info-toggle").addEventListener("click", () => setPanelVisible(!panelVisible));

    makeBarDraggable();
    showInspector(null);
    refreshUI();
  }

  function setPanelVisible(v) {
    panelVisible = v;
    const panel = root.querySelector("#vbl-panel");
    panel.style.display = v ? "block" : "none";
    if (v) positionPanel();
    refreshUI();
  }

  // Keep the flyout panel beside the bar (right of it, or left if no room).
  function positionPanel() {
    if (!panelVisible) return;
    const bar = root.querySelector("#vbl-bar");
    const panel = root.querySelector("#vbl-panel");
    const b = bar.getBoundingClientRect();
    const pw = 250;
    let left = b.right + 10;
    if (left + pw > window.innerWidth - 8) left = b.left - pw - 10;
    if (left < 8) left = 8;
    panel.style.left = left + "px";
    let top = b.top;
    top = Math.min(top, window.innerHeight - panel.offsetHeight - 8);
    panel.style.top = Math.max(8, top) + "px";
  }

  function makeBarDraggable() {
    const grip = root.querySelector("#vbl-grip");
    const bar = root.querySelector("#vbl-bar");
    let dragging = null;
    grip.addEventListener("mousedown", (e) => {
      const r = bar.getBoundingClientRect();
      dragging = { ox: e.clientX - r.left, oy: e.clientY - r.top };
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      bar.style.left = e.clientX - dragging.ox + "px";
      bar.style.top = e.clientY - dragging.oy + "px";
      bar.style.transform = "none";
      positionPanel();
    });
    window.addEventListener("mouseup", () => (dragging = null));
  }

  function setTool(t) {
    if (tool === "text" && t !== "text") finishTextEdit();
    tool = t;
    document.body.classList.toggle("vbl-mode-inspect", t === "inspect");
    document.body.classList.toggle("vbl-mode-move", t === "move");
    document.body.classList.toggle("vbl-mode-text", t === "text");
    if (!t) {
      hideOverlay(hoverOverlay);
      hideTag(hoverTag);
    }
    refreshUI();
  }

  function setToolbarVisible(v) {
    toolbarVisible = v;
    root.style.display = v ? "block" : "none";
    if (!v) {
      setTool(null);
      hideOverlay(hoverOverlay);
      hideTag(hoverTag);
      hideOverlay(selOverlay);
      hideTag(selTag);
    } else {
      root.querySelector("#vbl-panel").style.display = panelVisible ? "block" : "none";
      positionPanel();
      refreshSelectedOverlay();
    }
  }

  function refreshUI() {
    if (!root) return;
    root.querySelectorAll("[data-tool]").forEach((b) =>
      b.classList.toggle("vbl-tool--active", b.getAttribute("data-tool") === tool)
    );
    root.querySelector("#vbl-info-toggle").classList.toggle("vbl-tool--active", panelVisible);

    const toggle = root.querySelector("#vbl-toggle");
    toggle.classList.toggle("is-on", state.enabled);
    toggle.classList.toggle("is-off", !state.enabled);
    toggle.setAttribute(
      "data-tip",
      state.enabled ? "Edits ON — click to disable" : "Edits OFF — click to enable"
    );

    const count = Object.keys(state.edits).length;
    const badge = root.querySelector("#vbl-badge");
    badge.textContent = count;
    badge.classList.toggle("is-shown", count > 0);

    root.querySelector("#vbl-dot").classList.toggle("is-off", !state.enabled);
    root.querySelector("#vbl-status-text").textContent =
      count === 0
        ? "No saved edits yet."
        : `${count} element${count > 1 ? "s" : ""} edited · ${state.enabled ? "applied" : "paused"}`;

    root.querySelector("#vbl-panel").classList.toggle("is-disabled", !state.enabled);
  }

  // =========================================================================
  // Boot
  // =========================================================================
  async function init() {
    await loadState();

    hoverOverlay = makeOverlay();
    selOverlay = makeOverlay("vbl-overlay--selected");
    hoverTag = makeTag();
    selTag = makeTag();

    buildToolbar();
    setToolbarVisible(false); // start hidden; saved edits still apply below

    applyWithRetries();

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeyDown, true);

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === "VISBUG_TOGGLE_TOOLBAR") setToolbarVisible(!toolbarVisible);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
