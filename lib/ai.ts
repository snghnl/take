import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";

export type ProviderId = "anthropic" | "openai" | "google" | "mistral";

export interface ModelOption {
  id: string;
  label: string;
}

export interface Provider {
  id: ProviderId;
  label: string;
  keyPlaceholder: string;
  models: ModelOption[];
}

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    keyPlaceholder: "sk-ant-...",
    models: [
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keyPlaceholder: "sk-...",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "o3", label: "o3" },
      { id: "o4-mini", label: "o4 Mini" },
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5.4", label: "GPT-5.4" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    keyPlaceholder: "AIza...",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    keyPlaceholder: "...",
    models: [
      { id: "mistral-small-2503", label: "Mistral Small 3.1" },
      { id: "mistral-large-2411", label: "Mistral Large 2.1" },
      { id: "magistral-medium-2507", label: "Magistral Medium" },
      { id: "magistral-small-2507", label: "Magistral Small" },
      { id: "codestral-2501", label: "Codestral" },
      { id: "devstral-small-2507", label: "Devstral Small" },
    ],
  },
];

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  providerId: ProviderId;
  modelId: string;
  apiKey: string;
  messages: Message[];
  system?: string;
}

export async function chat({
  providerId,
  modelId,
  apiKey,
  messages,
  system,
}: ChatOptions): Promise<string> {
  switch (providerId) {
    case "anthropic": {
      const provider = createAnthropic({
        apiKey,
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      });
      const { text } = await generateText({
        model: provider(modelId),
        system,
        messages,
      });
      return text;
    }
    case "openai": {
      const provider = createOpenAI({ apiKey });
      const { text } = await generateText({
        model: provider(modelId),
        system,
        messages,
      });
      return text;
    }
    case "google": {
      const provider = createGoogleGenerativeAI({ apiKey });
      const { text } = await generateText({
        model: provider(modelId),
        system,
        messages,
      });
      return text;
    }
    case "mistral": {
      const provider = createMistral({ apiKey });
      const { text } = await generateText({
        model: provider(modelId),
        system,
        messages,
      });
      return text;
    }
  }
}
