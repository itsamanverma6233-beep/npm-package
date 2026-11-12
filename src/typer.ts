import type { StreamTyperOptions } from "./types.js";

/**
 * StreamTyper smoothly buffers and outputs streaming text (from LLMs like OpenAI, Gemini, Claude)
 * at a natural reading cadence with zero external dependencies.
 */
export class StreamTyper {
  private buffer: string[] = [];
  private accumulated = "";
  private isStreamEnded = false;
  private isRunning = false;
  private isPaused = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  private minDelay: number;
  private maxDelay: number;
  private punctuationPause: number;
  private mode: "char" | "word";
  private maxBufferThreshold: number;
  private onTextCallback?: (fullText: string, newChunk: string) => void;
  private onCompleteCallback?: () => void;

  constructor(options: StreamTyperOptions = {}) {
    this.minDelay = options.minDelay ?? 10;
    this.maxDelay = options.maxDelay ?? 30;
    this.punctuationPause = options.punctuationPause ?? 60;
    this.mode = options.mode ?? "char";
    this.maxBufferThreshold = options.maxBufferThreshold ?? 50;
    this.onTextCallback = options.onText;
    this.onCompleteCallback = options.onComplete;
  }

  /**
   * Feed an incoming chunk of text (from an AI stream or API response).
   */
  feed(chunk: string): this {
    if (!chunk) return this;

    if (this.mode === "word") {
      // Split preserving whitespace
      const words = chunk.match(/\S+\s*|\s+/g) || [chunk];
      this.buffer.push(...words);
    } else {
      // Character-by-character
      this.buffer.push(...Array.from(chunk));
    }

    if (!this.isRunning && !this.isPaused) {
      this.startTyping();
    }

    return this;
  }

  /**
   * Signal that the incoming stream has ended.
   * StreamTyper will finish typing any remaining buffered text, then trigger onComplete.
   */
  end(): this {
    this.isStreamEnded = true;

    // If buffer is already empty and not running, finish immediately
    if (this.buffer.length === 0 && !this.isRunning) {
      this.onCompleteCallback?.();
    }

    return this;
  }

  /**
   * Immediately flush all remaining buffered characters to the screen without waiting.
   */
  flush(): this {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.buffer.length > 0) {
      const remaining = this.buffer.join("");
      this.buffer = [];
      this.accumulated += remaining;
      this.onTextCallback?.(this.accumulated, remaining);
    }

    this.isRunning = false;

    if (this.isStreamEnded) {
      this.onCompleteCallback?.();
    }

    return this;
  }

  /**
   * Temporarily pause the typing effect.
   */
  pause(): this {
    this.isPaused = true;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isRunning = false;
    return this;
  }

  /**
   * Resume typing from where it was paused.
   */
  resume(): this {
    if (!this.isPaused) return this;
    this.isPaused = false;
    if (this.buffer.length > 0 && !this.isRunning) {
      this.startTyping();
    }
    return this;
  }

  /**
   * Reset the typer, clearing all buffers, timers, and accumulated text.
   */
  reset(): this {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.buffer = [];
    this.accumulated = "";
    this.isStreamEnded = false;
    this.isRunning = false;
    this.isPaused = false;
    return this;
  }

  /**
   * The complete accumulated text that has been output so far.
   */
  get text(): string {
    return this.accumulated;
  }

  /**
   * The remaining text waiting in the queue to be typed.
   */
  get buffered(): string {
    return this.buffer.join("");
  }

  /**
   * Whether the typer is currently typing characters.
   */
  get isTyping(): boolean {
    return this.isRunning;
  }

  /**
   * Internal loop to emit characters at an adaptive speed.
   */
  private startTyping(): void {
    this.isRunning = true;

    const tick = () => {
      if (this.isPaused) {
        this.isRunning = false;
        return;
      }

      if (this.buffer.length === 0) {
        this.isRunning = false;
        if (this.isStreamEnded) {
          this.onCompleteCallback?.();
        }
        return;
      }

      // Adaptive speed calculation:
      // If buffer has many items waiting, emit faster or in small batches to prevent lag
      const queueSize = this.buffer.length;
      let batchCount = 1;

      if (queueSize > this.maxBufferThreshold * 2) {
        batchCount = Math.min(queueSize, 5);
      } else if (queueSize > this.maxBufferThreshold) {
        batchCount = 2;
      }

      const nextParts = this.buffer.splice(0, batchCount);
      const nextStr = nextParts.join("");
      this.accumulated += nextStr;

      this.onTextCallback?.(this.accumulated, nextStr);

      // Calculate delay for next tick
      const nextDelay = this.calculateDelay(nextStr, queueSize);
      this.timeoutId = setTimeout(tick, nextDelay);
    };

    this.timeoutId = setTimeout(tick, this.minDelay);
  }

  /**
   * Calculate adaptive delay based on queue length and punctuation.
   */
  private calculateDelay(emittedStr: string, remainingQueueSize: number): number {
    // 1. Base delay interpolates between maxDelay and minDelay based on buffer fullness
    const ratio = Math.min(1, remainingQueueSize / this.maxBufferThreshold);
    let delay = this.maxDelay - ratio * (this.maxDelay - this.minDelay);

    // 2. Extra pause on punctuation for natural human-like cadence
    if (this.punctuationPause > 0) {
      const lastChar = emittedStr.slice(-1);
      if (lastChar === "." || lastChar === "!" || lastChar === "?" || lastChar === "\n") {
        delay += this.punctuationPause;
      } else if (lastChar === "," || lastChar === ";" || lastChar === ":") {
        delay += Math.floor(this.punctuationPause * 0.5);
      }
    }

    return Math.max(this.minDelay, Math.round(delay));
  }
}

/**
 * Convenience helper to instantiate a StreamTyper.
 */
export function createStreamTyper(options?: StreamTyperOptions): StreamTyper {
  return new StreamTyper(options);
}
