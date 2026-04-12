export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_SIDEPANEL') {
      browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id) {
          chrome.sidePanel.open({ tabId: tab.id });
        }
      });
      return true;
    }

    if (message.type === 'ARCHIVE_PAGE') {
      const item = message.item as ArchiveItem;
      browser.storage.local.get('archives').then((result) => {
        const archives: ArchiveItem[] = result.archives ?? [];
        const existing = archives.findIndex((a) => a.url === item.url);
        if (existing !== -1) {
          archives[existing] = item;
        } else {
          archives.unshift(item);
          if (archives.length > 100) archives.pop();
        }
        browser.storage.local.set({ archives }).then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === 'GET_ARCHIVES') {
      browser.storage.local.get('archives').then((result) => {
        sendResponse({ archives: result.archives ?? [] });
      });
      return true;
    }

    if (message.type === 'DELETE_ARCHIVE') {
      browser.storage.local.get('archives').then((result) => {
        const archives: ArchiveItem[] = result.archives ?? [];
        const updated = archives.filter((a) => a.id !== message.id);
        browser.storage.local.set({ archives: updated }).then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === 'GET_PAGE_CONTENT') {
      browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (!tab?.id) {
          sendResponse({ error: 'No active tab' });
          return;
        }
        browser.scripting
          .executeScript({
            target: { tabId: tab.id },
            func: () => ({
              content: document.body?.innerText?.slice(0, 50000) ?? '',
              title: document.title,
              url: location.href,
            }),
          })
          .then(([result]) => sendResponse(result.result))
          .catch((err) => sendResponse({ error: String(err) }));
      });
      return true;
    }
  });
});

interface ArchiveItem {
  id: string;
  url: string;
  title: string;
  textContent: string;
  date: string;
}
