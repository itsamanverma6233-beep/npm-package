import { describe, it, expect, vi } from "vitest";
import { StreamTyper, createStreamTyper, typeStream } from "../src/index.js";

describe("StreamTyper", () => {
  it("initializes with default options", () => {
    const typer = new StreamTyper();
    expect(typer.text).toBe("");
    expect(typer.buffered).toBe("");
    expect(typer.isTyping).toBe(false);
  });

  it("buffers incoming chunks and types them out", async () => {
    const emitted: string[] = [];

    await new Promise<void>((resolve) => {
      const typer = new StreamTyper({
        minDelay: 2,
        maxDelay: 5,
        punctuationPause: 0,
        onText: (fullText) => {
          emitted.push(fullText);
        },
        onComplete: () => {
          resolve();
        },
      });

      typer.feed("Hello ");
      typer.feed("World!");
      typer.end();
    });

    expect(emitted[emitted.length - 1]).toBe("Hello World!");
    expect(emitted.length).toBeGreaterThan(1);
  });

  it("handles word mode properly", async () => {
    const emitted: string[] = [];

    await new Promise<void>((resolve) => {
      const typer = new StreamTyper({
        mode: "word",
        minDelay: 2,
        maxDelay: 4,
        punctuationPause: 0,
        onText: (fullText) => {
          emitted.push(fullText);
        },
        onComplete: () => {
          resolve();
        },
      });

      typer.feed("Quick brown fox ");
      typer.feed("jumps over lazy dog.");
      typer.end();
    });

    expect(emitted[emitted.length - 1]).toBe("Quick brown fox jumps over lazy dog.");
  });

  it("flushes remaining text immediately when flush() is called", () => {
    let finalOutput = "";
    const typer = new StreamTyper({
      minDelay: 50,
      maxDelay: 100,
      onText: (fullText) => {
        finalOutput = fullText;
      },
    });

    typer.feed("Instant message that needs urgent delivery.");
    expect(typer.text.length).toBeLessThan(40);

    typer.flush();
    expect(typer.text).toBe("Instant message that needs urgent delivery.");
    expect(finalOutput).toBe("Instant message that needs urgent delivery.");
    expect(typer.buffered).toBe("");
  });

  it("supports pausing and resuming", async () => {
    const snapshots: number[] = [];

    const typer = new StreamTyper({
      minDelay: 10,
      maxDelay: 20,
    });

    typer.feed("This text will be paused midway.");
    await new Promise((r) => setTimeout(r, 40));

    typer.pause();
    const lengthWhenPaused = typer.text.length;
    snapshots.push(lengthWhenPaused);

    // Wait and verify text does not grow while paused
    await new Promise((r) => setTimeout(r, 60));
    expect(typer.text.length).toBe(lengthWhenPaused);

    // Resume and wait
    typer.resume();
    await new Promise((r) => setTimeout(r, 60));
    expect(typer.text.length).toBeGreaterThan(lengthWhenPaused);
    typer.flush();
  });

  it("resets state completely on reset()", () => {
    const typer = new StreamTyper({ minDelay: 20 });
    typer.feed("Some long text that should be erased.");
    typer.reset();

    expect(typer.text).toBe("");
    expect(typer.buffered).toBe("");
    expect(typer.isTyping).toBe(false);
  });

  it("createStreamTyper helper creates an instance", () => {
    const typer = createStreamTyper({ minDelay: 5 });
    expect(typer).toBeInstanceOf(StreamTyper);
  });
});

describe("typeStream helper", () => {
  it("consumes an AsyncIterable (e.g., OpenAI SDK style)", async () => {
    async function* fakeAiStream() {
      yield "Artificial ";
      yield "Intelligence ";
      yield "Streaming.";
    }

    let result = "";
    const fullText = await typeStream(fakeAiStream(), {
      minDelay: 1,
      maxDelay: 3,
      punctuationPause: 0,
      onText: (text) => {
        result = text;
      },
    });

    expect(fullText).toBe("Artificial Intelligence Streaming.");
    expect(result).toBe("Artificial Intelligence Streaming.");
  });

  it("consumes a Web ReadableStream (e.g., fetch body style)", async () => {
    const chunks = ["Hi, ", "I am ", "Gemini!"];
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    let result = "";
    const finalResult = await typeStream(stream, {
      minDelay: 1,
      maxDelay: 3,
      punctuationPause: 0,
      onText: (text) => {
        result = text;
      },
    });

    expect(finalResult).toBe("Hi, I am Gemini!");
    expect(result).toBe("Hi, I am Gemini!");
  });
});
