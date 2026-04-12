export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // ─── Toolbar ──────────────────────────────────────────────────────────────

    const COLORS: { name: string; bg: string }[] = [
      { name: 'yellow', bg: '#fef08a' },
      { name: 'green', bg: '#bbf7d0' },
      { name: 'blue', bg: '#bfdbfe' },
      { name: 'pink', bg: '#fbcfe8' },
    ];

    const toolbar = document.createElement('div');
    toolbar.id = '__take_toolbar__';
    Object.assign(toolbar.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'none',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      userSelect: 'none',
    });

    COLORS.forEach(({ name, bg }) => {
      const btn = document.createElement('button');
      btn.dataset.color = bg;
      btn.dataset.colorName = name;
      Object.assign(btn.style, {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: bg,
        border: '1.5px solid rgba(0,0,0,0.15)',
        cursor: 'pointer',
        padding: '0',
        flexShrink: '0',
      });
      toolbar.appendChild(btn);
    });

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      width: '1px',
      height: '18px',
      background: '#e2e8f0',
      margin: '0 2px',
    });
    toolbar.appendChild(divider);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    Object.assign(removeBtn.style, {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      color: '#64748b',
      padding: '0 2px',
      lineHeight: '1',
    });
    toolbar.appendChild(removeBtn);

    document.documentElement.appendChild(toolbar);

    // ─── State ────────────────────────────────────────────────────────────────

    let savedRange: Range | null = null;
    let activeMarkId: string | null = null;

    function hideToolbar() {
      toolbar.style.display = 'none';
      savedRange = null;
      activeMarkId = null;
    }

    function showToolbar(x: number, y: number) {
      toolbar.style.display = 'flex';
      const rect = toolbar.getBoundingClientRect();
      let left = x;
      let top = y - rect.height - 6;
      if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
      if (top < 8) top = y + 18;
      toolbar.style.left = left + 'px';
      toolbar.style.top = top + 'px';
    }

    // ─── Storage helpers ──────────────────────────────────────────────────────

    const storageKey = () => `hl_${location.href}`;

    async function loadHighlights(): Promise<HLData[]> {
      const result = await browser.storage.local.get(storageKey());
      return result[storageKey()] ?? [];
    }

    async function saveHighlight(hl: HLData) {
      const existing = await loadHighlights();
      const idx = existing.findIndex((h) => h.id === hl.id);
      if (idx !== -1) existing[idx] = hl;
      else existing.push(hl);
      await browser.storage.local.set({ [storageKey()]: existing });
    }

    async function deleteHighlight(id: string) {
      const existing = await loadHighlights();
      const updated = existing.filter((h) => h.id !== id);
      await browser.storage.local.set({ [storageKey()]: updated });
    }

    // ─── Highlight helpers ────────────────────────────────────────────────────

    function wrapRange(range: Range, bg: string, id: string) {
      const mark = document.createElement('mark');
      mark.dataset.hlId = id;
      mark.style.background = bg;
      mark.style.borderRadius = '2px';
      range.surroundContents(mark);
      return mark;
    }

    function unwrapMark(mark: HTMLElement) {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }

    function restoreHighlights(highlights: HLData[]) {
      highlights.forEach((hl) => {
        try {
          applyHighlightByText(hl.text, hl.bg, hl.id);
        } catch (_) {
          // best-effort
        }
      });
    }

    function applyHighlightByText(text: string, bg: string, id: string) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
          if (parent.closest('mark[data-hl-id]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const idx = node.nodeValue?.indexOf(text) ?? -1;
        if (idx === -1) continue;
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + text.length);
        wrapRange(range, bg, id);
        break;
      }
    }

    // ─── Mouse events ─────────────────────────────────────────────────────────

    document.addEventListener('mouseup', (e) => {
      if (toolbar.contains(e.target as Node)) return;

      const sel = window.getSelection();

      // Clicked on existing mark?
      const mark = (e.target as HTMLElement).closest?.('mark[data-hl-id]') as HTMLElement | null;
      if (mark && (!sel || sel.isCollapsed)) {
        activeMarkId = mark.dataset.hlId ?? null;
        const range = document.createRange();
        range.selectNodeContents(mark);
        savedRange = range;
        showToolbar(e.clientX, e.clientY);
        return;
      }

      if (!sel || sel.isCollapsed || !sel.rangeCount) return;

      const range = sel.getRangeAt(0);
      const text = sel.toString().trim();
      if (!text) return;

      savedRange = range.cloneRange();
      activeMarkId = null;
      showToolbar(e.clientX, e.clientY);
    });

    document.addEventListener('mousedown', (e) => {
      if (!toolbar.contains(e.target as Node)) hideToolbar();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideToolbar();
    });

    // ─── Toolbar button handlers ──────────────────────────────────────────────

    toolbar.addEventListener('mousedown', (e) => {
      e.preventDefault(); // preserve selection
    });

    toolbar.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Color button
      const bg = target.dataset.color;
      const colorName = target.dataset.colorName;
      if (bg && colorName && savedRange) {
        const sel = window.getSelection();

        if (activeMarkId) {
          // Re-color existing mark
          const mark = document.querySelector(`mark[data-hl-id="${activeMarkId}"]`) as HTMLElement | null;
          if (mark) {
            mark.style.background = bg;
            const highlights = await loadHighlights();
            const hl = highlights.find((h) => h.id === activeMarkId);
            if (hl) {
              hl.bg = bg;
              hl.colorName = colorName;
              await saveHighlight(hl);
            }
          }
        } else {
          const id = String(Date.now());
          const text = sel?.toString().trim() ?? savedRange.toString().trim();
          if (!text) { hideToolbar(); return; }
          try {
            wrapRange(savedRange, bg, id);
          } catch (_) {
            // surroundContents fails on cross-element selections; skip gracefully
            hideToolbar();
            sel?.removeAllRanges();
            return;
          }
          await saveHighlight({ id, text, bg, colorName });
          sel?.removeAllRanges();
        }

        hideToolbar();
        return;
      }

      // Remove button
      if (target === removeBtn) {
        if (activeMarkId) {
          const mark = document.querySelector(`mark[data-hl-id="${activeMarkId}"]`) as HTMLElement | null;
          if (mark) unwrapMark(mark);
          await deleteHighlight(activeMarkId);
        } else if (savedRange) {
          // find mark ancestor from range
          const container = savedRange.commonAncestorContainer as HTMLElement;
          const mark = (container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement)
            ?.closest?.('mark[data-hl-id]') as HTMLElement | null;
          if (mark) {
            const id = mark.dataset.hlId!;
            unwrapMark(mark);
            await deleteHighlight(id);
          }
        }
        hideToolbar();
      }
    });

    // ─── Restore on load ──────────────────────────────────────────────────────

    loadHighlights().then((highlights) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => restoreHighlights(highlights));
      } else {
        restoreHighlights(highlights);
      }
    });
  },
});

interface HLData {
  id: string;
  text: string;
  bg: string;
  colorName: string;
}
