import { StreamTyper } from "./typer.js";
import type { TypeStreamOptions } from "./types.js";

/**
 * Pipe any Web ReadableStream (like `fetch().body`) or AsyncIterable (like OpenAI SDK stream)
 * directly into a typewriter effect.
 *
 * @example
 * ```ts
 * const response = await fetch('/api/chat');
 * await typeStream(response.body!, {
 *   onText: (text) => {
 *     chatBubble.textContent = text;
 *   }
 * });
 * ```
 */
export async function typeStream(
  stream: ReadableStream<Uint8Array | string> | AsyncIterable<Uint8Array | string>,
  options: TypeStreamOptions = {}
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const decoder = options.decoder ?? new TextDecoder();

    const typer = new StreamTyper({
      ...options,
      onComplete: () => {
        options.onComplete?.();
        resolve(typer.text);
      },
    });

    const decodeChunk = (chunk: Uint8Array | string): string => {
      if (typeof chunk === "string") return chunk;
      if (chunk instanceof Uint8Array || ArrayBuffer.isView(chunk)) {
        return decoder.decode(chunk, { stream: true });
      }
      return String(chunk);
    };

    (async () => {
      try {
        if (stream && Symbol.asyncIterator in stream) {
          // Handles AsyncIterables as well as ReadableStreams in Node/modern browsers
          for await (const rawChunk of stream as AsyncIterable<Uint8Array | string>) {
            typer.feed(decodeChunk(rawChunk));
          }
        } else if (stream && typeof (stream as ReadableStream).getReader === "function") {
          // Fallback for ReadableStream without asyncIterator
          const reader = (stream as ReadableStream<Uint8Array | string>).getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value !== undefined) {
              typer.feed(decodeChunk(value));
            }
          }
        } else {
          throw new TypeError(
            "Expected stream to be a ReadableStream or an AsyncIterable."
          );
        }

        typer.end();
      } catch (err) {
        typer.reset();
        reject(err);
      }
    })();
  });
}
