import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { chat, PROVIDERS, type Message, type ProviderId } from "@/lib/ai";
import ReactMarkdown from "react-markdown";

type Tab = "chat" | "settings";

interface PageCtx {
  content: string;
  title: string;
  url: string;
}

const DEFAULT_PROVIDER = PROVIDERS[0];
const DEFAULT_MODEL = DEFAULT_PROVIDER.models[0].id;

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageCtx, setPageCtx] = useState<PageCtx | null>(null);
  const [error, setError] = useState("");

  // Active settings (used for chat)
  const [providerId, setProviderId] = useState<ProviderId>(DEFAULT_PROVIDER.id);
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState("");

  // Draft settings (edited in Settings tab, saved on Save)
  const [draftProviderId, setDraftProviderId] = useState<ProviderId>(
    DEFAULT_PROVIDER.id,
  );
  const [draftModelId, setDraftModelId] = useState(DEFAULT_MODEL);
  const [draftApiKey, setDraftApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    browser.storage.sync
      .get(["apiKey", "providerId", "modelId"])
      .then((res) => {
        const pid = (res.providerId as ProviderId) ?? DEFAULT_PROVIDER.id;
        const mid = (res.modelId as string) ?? DEFAULT_MODEL;
        const key = (res.apiKey as string) ?? "";
        setProviderId(pid);
        setModelId(mid);
        setApiKey(key);
        setDraftProviderId(pid);
        setDraftModelId(mid);
        setDraftApiKey(key);
      });
    fetchPageCtx();

    const onActivated = () => fetchPageCtx();
    const onUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
    ) => {
      if (changeInfo.status === "complete") fetchPageCtx();
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  async function fetchPageCtx() {
    try {
      const res = await browser.runtime.sendMessage({
        type: "GET_PAGE_CONTENT",
      });
      if (res && !res.error) setPageCtx(res);
    } catch (_) {}
  }

  async function handleSend({ text }: PromptInputMessage) {
    if (!text.trim() || loading) return;
    if (!apiKey) {
      setError("Set your API key in Settings first.");
      return;
    }

    setError("");
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const system = pageCtx
        ? `You are a helpful assistant. The user is viewing:\nTitle: ${pageCtx.title}\nURL: ${pageCtx.url}\n\nPage content:\n${pageCtx.content}`
        : "You are a helpful assistant.";

      const reply = await chat({
        providerId,
        modelId,
        apiKey,
        messages: newMessages,
        system,
      });
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleSaveSettings() {
    browser.storage.sync.set({
      apiKey: draftApiKey,
      providerId: draftProviderId,
      modelId: draftModelId,
    });
    setApiKey(draftApiKey);
    setProviderId(draftProviderId);
    setModelId(draftModelId);
    setTab("chat");
  }

  function handleDraftProviderChange(pid: ProviderId) {
    const provider = PROVIDERS.find((p) => p.id === pid)!;
    setDraftProviderId(pid);
    setDraftModelId(provider.models[0].id);
  }

  const draftProvider = PROVIDERS.find((p) => p.id === draftProviderId)!;

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as Tab)}
      className="flex flex-col h-screen gap-0 text-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <div className="flex-1" />
        {tab === "chat" && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={fetchPageCtx}
              title="Refresh page context"
              className="text-base"
            >
              ↺
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMessages([])}
              title="Clear chat"
            >
              ✕
            </Button>
          </>
        )}
      </div>

      {/* Settings tab */}
      <TabsContent value="settings" className="overflow-auto">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label>Provider</Label>
            <Select
              value={draftProviderId}
              onValueChange={handleDraftProviderChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Model</Label>
            <Select value={draftModelId} onValueChange={setDraftModelId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {draftProvider.models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={draftApiKey}
                onChange={(e) => setDraftApiKey(e.target.value)}
                placeholder={draftProvider.keyPlaceholder}
                className="pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 text-muted-foreground"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <Button onClick={handleSaveSettings}>Save</Button>
        </div>
      </TabsContent>

      {/* Chat tab */}
      <TabsContent value="chat" className="flex flex-col overflow-hidden">
        {/* Page context bar */}
        {pageCtx && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border-b border-green-100 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-xs text-green-700 truncate">
              {pageCtx.title || pageCtx.url}
            </span>
          </div>
        )}

        {/* Messages */}
        <Conversation>
          <ConversationContent>
            {messages.length === 0 && !loading ? (
              <ConversationEmptyState
                title="Ask anything"
                description="Ask anything about the current page"
              />
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border text-foreground rounded-bl-sm"
                      }`}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-xl rounded-bl-sm px-3 py-2.5 flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mx-3 mb-2 shrink-0">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input */}
        <PromptInput
          onSubmit={handleSend}
          className="border-t border-border shrink-0 rounded-none pb-2 px-2"
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask about this page…" />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputTools>
              <PromptInputSubmit status={loading ? "submitted" : "idle"} />
            </PromptInputTools>
          </PromptInputFooter>
        </PromptInput>
      </TabsContent>
    </Tabs>
  );
}
