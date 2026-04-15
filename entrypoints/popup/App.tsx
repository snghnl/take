import { useState, useEffect } from "react";
import type { ArchiveItem } from "../../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SquareArrowOutUpRight } from "lucide-react";
import "./App.css";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function App() {
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    loadArchives();
  }, []);

  async function loadArchives() {
    const res = await browser.runtime.sendMessage({ type: "GET_ARCHIVES" });
    setArchives((res?.archives ?? []).slice(0, 8));
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;
      const [result] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          url: location.href,
          title: document.title,
          textContent: document.body?.innerText?.slice(0, 50000) ?? "",
        }),
      });

      if (!result.result) return;

      const item: ArchiveItem = {
        id: String(Date.now()),
        url: result.result.url,
        title: result.result.title,
        textContent: result.result.textContent,
        date: new Date().toISOString(),
        favicon: tab.favIconUrl,
      };
      await browser.runtime.sendMessage({ type: "ARCHIVE_PAGE", item });
      setArchived(true);
      setTimeout(() => setArchived(false), 1500);
      await loadArchives();
    } finally {
      setArchiving(false);
    }
  }

  async function handleChat() {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  }

  async function handleDelete(id: string) {
    await browser.runtime.sendMessage({ type: "DELETE_ARCHIVE", id });
    await loadArchives();
  }

  async function handleOpenTab() {
    await browser.tabs.create({ url: browser.runtime.getURL("archive.html") });
    window.close();
  }

  return (
    <div className="w-[340px] font-sans bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-3 border-b border-border">
        <span className="flex-1 font-bold text-[15px]">Take</span>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={handleArchive} disabled={archiving}>
            {archived ? "✓ Archived" : "📥 Archive page"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleChat}>
            💬 Chat
          </Button>
        </div>
      </div>

      {/* Archives */}
      <div className="px-3.5 pt-2.5 pb-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Archives
          </span>
          <div className="flex flex-row items-center gap-1.5">
            <Badge variant="secondary">{archives.length}</Badge>
            <SquareArrowOutUpRight
              className="size-3 text-muted-foreground"
              onClick={handleOpenTab}
            />
          </div>
        </div>

        {archives.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-5">
            No archives yet
          </p>
        ) : (
          <div className="max-h-70 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <div className="flex flex-col gap-1.5 w-full px-px py-1">
              {archives.map((item) => (
                <Card
                  key={item.id}
                  className="flex flex-row items-center gap-0 px-2.5 py-2 rounded-lg"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-0 truncate text-xs text-foreground no-underline hover:text-primary hover:underline"
                    title={item.title}
                  >
                    {item.title || item.url}
                  </a>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-1.5">
                    {formatDate(item.date)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                    className="text-muted-foreground hover:text-destructive shrink-0 ml-0.5"
                  >
                    ✕
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
