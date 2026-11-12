# ai-stream-typer ⚡️

> Ultra-lightweight, zero-dependency streaming text smoother and typewriter effect for AI (LLM) responses.

[![npm version](https://img.shields.io/npm/v/ai-stream-typer.svg?style=flat-square&color=6366f1)](https://www.npmjs.com/package/ai-stream-typer)
[![license](https://img.shields.io/github/license/itsamanverma6233-beep/npm-package?style=flat-square)](https://github.com/itsamanverma6233-beep/npm-package/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ai-stream-typer?style=flat-square&color=10b981)](https://bundlephobia.com/package/ai-stream-typer)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg?style=flat-square)](https://www.npmjs.com/package/ai-stream-typer)
[![CI](https://img.shields.io/github/actions/workflow/status/itsamanverma6233-beep/npm-package/ci.yml?branch=main&style=flat-square&label=tests)](https://github.com/itsamanverma6233-beep/npm-package/actions)

---

### The Problem

When streaming responses from LLMs (OpenAI, Gemini, Anthropic, Ollama), text arrives in **uneven, choppy bursts** over the network—sometimes 10 words at once, then a 500ms lag. Rendering raw chunks causes jarring, flickering text jumps.

### The Solution: `ai-stream-typer`

`ai-stream-typer` acts as an **adaptive pacing buffer**:
* 🌊 **Smooth Reading Cadence**: Emits text at a steady, human-readable speed.
* 🧠 **Adaptive Speed**: When the AI outputs text faster than reading speed, it automatically speeds up so it never falls behind.
* ✍️ **Natural Punctuation Pauses**: Adds micro-pauses on periods, question marks, commas, and newlines.
* 📦 **Zero Dependencies & < 1 KB**: Pure JavaScript/TypeScript. Works in React, Next.js, Vue, Svelte, Node.js, and Vanilla JS.

---

## 🚀 Installation

```bash
npm install ai-stream-typer
# or
pnpm add ai-stream-typer
# or
yarn add ai-stream-typer
```

---

## ⚡️ Quick Start

### 1. Basic Usage

```ts
import { StreamTyper } from "ai-stream-typer";

const typer = new StreamTyper({
  onText: (text) => {
    document.getElementById("chat").textContent = text;
  },
  onComplete: () => {
    console.log("Finished typing!");
  }
});

// Feed chunks as they arrive from your AI stream:
typer.feed("Hello ");
typer.feed("world! ");
typer.feed("How can I help you today?");

// Signal that the stream has finished:
typer.end();
```

---

### 2. Auto-Piping with `fetch()` Streams (`typeStream`)

Pipe any Web `ReadableStream` directly into the typewriter in one step:

```ts
import { typeStream } from "ai-stream-typer";

const res = await fetch("/api/chat", { method: "POST" });

await typeStream(res.body!, {
  onText: (fullText) => {
    chatBubble.textContent = fullText;
  }
});
```

---

### 3. OpenAI / Anthropic SDK Streaming

```ts
import OpenAI from "openai";
import { typeStream } from "ai-stream-typer";

const openai = new OpenAI();

async function streamChat() {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Tell me a joke" }],
    stream: true,
  });

  async function* textStream() {
    for await (const chunk of stream) {
      yield chunk.choices[0]?.delta?.content || "";
    }
  }

  await typeStream(textStream(), {
    onText: (text) => {
      process.stdout.write(text);
    }
  });
}
```

---

### 4. React Example

```tsx
import React, { useState, useRef } from "react";
import { StreamTyper } from "ai-stream-typer";

export function ChatMessage() {
  const [content, setContent] = useState("");
  const typerRef = useRef<StreamTyper | null>(null);

  const startStream = async () => {
    typerRef.current = new StreamTyper({
      onText: setContent
    });

    const res = await fetch("/api/chat");
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      typerRef.current.feed(decoder.decode(value));
    }

    typerRef.current.end();
  };

  return (
    <div>
      <p>{content}<span className="cursor">|</span></p>
      <button onClick={startStream}>Generate</button>
    </div>
  );
}
```

---

## ⚙️ Configuration & Options

Pass any of these options into `new StreamTyper(options)` or `typeStream(stream, options)`:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `minDelay` | `number` | `10` | Minimum delay (ms) between characters. |
| `maxDelay` | `number` | `30` | Maximum delay (ms) between characters when buffer is low. |
| `punctuationPause` | `number` | `60` | Extra pause (ms) on `.`, `!`, `?`, `\n`. (Set `0` to disable). |
| `mode` | `"char" \| "word"` | `"char"` | Emit character-by-character or word-by-word. |
| `maxBufferThreshold` | `number` | `50` | Maximum queued characters before speed automatically increases. |
| `onText` | `(fullText, chunk) => void` | `undefined` | Callback fired on every new character/word. |
| `onComplete` | `() => void` | `undefined` | Callback fired when all text has finished typing. |

---

## 🛠 Methods

* `typer.feed(chunk: string)`: Push an incoming chunk into the queue.
* `typer.end()`: Signal stream completion; wraps up remaining characters and calls `onComplete`.
* `typer.flush()`: Immediately output all buffered text with zero delay.
* `typer.pause()`: Temporarily pause typing.
* `typer.resume()`: Resume typing from where it was paused.
* `typer.reset()`: Clear buffer, timers, and accumulated text.
* `typer.text`: Getter returning the complete text output so far.
* `typer.isTyping`: Getter returning `true` if characters are actively being emitted.

---

## 🧪 Testing

```bash
npm test
```

Includes comprehensive unit tests covering buffering, adaptive speed, async iterables, readable streams, and edge cases.

---

## 📄 License

MIT © [Aman Verma](https://github.com/itsamanverma6233-beep)
