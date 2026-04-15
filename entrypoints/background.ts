import type { ArchiveItem, Folder } from "../types";

export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "OPEN_SIDEPANEL") {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (tab?.id) {
            chrome.sidePanel.open({ tabId: tab.id });
          }
        });
      return true;
    }

    if (message.type === "ARCHIVE_PAGE") {
      const item = message.item as ArchiveItem;
      browser.storage.local.get("archives").then((result) => {
        const archives: ArchiveItem[] = result.archives ?? [];
        const existing = archives.findIndex((a) => a.url === item.url);
        if (existing !== -1) {
          archives[existing] = item;
        } else {
          archives.unshift(item);
          if (archives.length > 100) archives.pop();
        }
        browser.storage.local
          .set({ archives })
          .then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === "GET_ARCHIVES") {
      browser.storage.local.get("archives").then((result) => {
        sendResponse({ archives: result.archives ?? [] });
      });
      return true;
    }

    if (message.type === "DELETE_ARCHIVE") {
      browser.storage.local.get("archives").then((result) => {
        const archives: ArchiveItem[] = result.archives ?? [];
        const updated = archives.filter((a) => a.id !== message.id);
        browser.storage.local
          .set({ archives: updated })
          .then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === "MOVE_ARCHIVE") {
      browser.storage.local.get("archives").then((result) => {
        const archives: ArchiveItem[] = result.archives ?? [];
        const updated = archives.map((a) =>
          a.id === message.id ? { ...a, folderId: message.folderId ?? null } : a,
        );
        browser.storage.local
          .set({ archives: updated })
          .then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === "GET_FOLDERS") {
      browser.storage.local.get("folders").then((result) => {
        sendResponse({ folders: result.folders ?? [] });
      });
      return true;
    }

    if (message.type === "CREATE_FOLDER") {
      browser.storage.local.get("folders").then((result) => {
        const folders: Folder[] = result.folders ?? [];
        const parentId = message.parentId ?? null;
        const duplicate = folders.some(
          (f) => f.parentId === parentId && f.name === message.name,
        );
        if (duplicate) {
          sendResponse({ ok: false, error: "A folder with that name already exists here." });
          return;
        }
        const newFolder: Folder = {
          id: String(Date.now()),
          name: message.name,
          parentId,
        };
        folders.push(newFolder);
        browser.storage.local
          .set({ folders })
          .then(() => sendResponse({ ok: true, folder: newFolder }));
      });
      return true;
    }

    if (message.type === "RENAME_FOLDER") {
      browser.storage.local.get("folders").then((result) => {
        const folders: Folder[] = result.folders ?? [];
        const target = folders.find((f) => f.id === message.id);
        if (!target) {
          sendResponse({ ok: false, error: "Folder not found." });
          return;
        }
        const duplicate = folders.some(
          (f) => f.id !== message.id && f.parentId === target.parentId && f.name === message.name,
        );
        if (duplicate) {
          sendResponse({ ok: false, error: "A folder with that name already exists here." });
          return;
        }
        const updated = folders.map((f) =>
          f.id === message.id ? { ...f, name: message.name } : f,
        );
        browser.storage.local
          .set({ folders: updated })
          .then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === "DELETE_FOLDER") {
      browser.storage.local.get(["folders", "archives"]).then((result) => {
        const folders: Folder[] = result.folders ?? [];
        const archives: ArchiveItem[] = result.archives ?? [];

        // Collect all folder ids to delete (the folder + all descendants)
        const toDelete = new Set<string>();
        const collect = (id: string) => {
          toDelete.add(id);
          folders
            .filter((f) => f.parentId === id)
            .forEach((f) => collect(f.id));
        };
        collect(message.id);

        const updatedFolders = folders.filter((f) => !toDelete.has(f.id));
        // Move archives that were in deleted folders to root
        const updatedArchives = archives.map((a) =>
          a.folderId && toDelete.has(a.folderId)
            ? { ...a, folderId: null }
            : a,
        );

        browser.storage.local
          .set({ folders: updatedFolders, archives: updatedArchives })
          .then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === "GET_PAGE_CONTENT") {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (!tab?.id) {
            sendResponse({ error: "No active tab" });
            return;
          }
          browser.scripting
            .executeScript({
              target: { tabId: tab.id },
              func: () => ({
                content: document.body?.innerText?.slice(0, 50000) ?? "",
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
