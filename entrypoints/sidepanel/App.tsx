import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Tab = 'chat' | 'settings';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PageCtx {
  content: string;
  title: string;
  url: string;
}

const MODELS = [
  { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('chat');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(MODELS[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageCtx, setPageCtx] = useState<PageCtx | null>(null);
  const [error, setError] = useState('');
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [settingsModel, setSettingsModel] = useState(MODELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    browser.storage.sync.get(['apiKey', 'model']).then((res) => {
      if (res.apiKey) { setApiKey(res.apiKey); setSettingsApiKey(res.apiKey); }
      if (res.model) { setModel(res.model); setSettingsModel(res.model); }
    });
    fetchPageCtx();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function fetchPageCtx() {
    try {
      const res = await browser.runtime.sendMessage({ type: 'GET_PAGE_CONTENT' });
      if (res && !res.error) setPageCtx(res);
    } catch (_) {}
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    if (!apiKey) { setError('Set your API key in Settings first.'); return; }

    setError('');
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = pageCtx
        ? `You are a helpful assistant. The user is viewing:\nTitle: ${pageCtx.title}\nURL: ${pageCtx.url}\n\nPage content:\n${pageCtx.content}`
        : 'You are a helpful assistant.';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: newMessages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err?.error?.message ?? res.statusText);
      }

      const data = await res.json();
      const reply = data.content?.[0]?.text ?? '';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSaveSettings() {
    browser.storage.sync.set({ apiKey: settingsApiKey, model: settingsModel });
    setApiKey(settingsApiKey);
    setModel(settingsModel);
    setTab('chat');
  }

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
        {tab === 'chat' && (
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
            <Label htmlFor="api-key">Anthropic API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={settingsApiKey}
              onChange={(e) => setSettingsApiKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model-select">Model</Label>
            <Select value={settingsModel} onValueChange={setSettingsModel}>
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <span className="text-xs text-green-700 truncate">{pageCtx.title || pageCtx.url}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <span className="text-3xl">💬</span>
              <span className="text-xs text-center">Ask anything about the current page</span>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border text-foreground rounded-bl-sm'
                }`}
              >
                {msg.content}
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
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mx-3 mb-2 shrink-0">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input */}
        <div className="flex items-end gap-2 px-3 py-2.5 border-t border-border shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this page…"
            rows={1}
            className="flex-1 resize-none max-h-32 overflow-y-auto leading-relaxed"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0"
          >
            ↑
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
