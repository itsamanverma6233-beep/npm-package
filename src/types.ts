/**
 * Configuration options for StreamTyper.
 */
export interface StreamTyperOptions {
  /**
   * Minimum delay (in milliseconds) between characters.
   * @default 10
   */
  minDelay?: number;

  /**
   * Maximum delay (in milliseconds) between characters when the buffer is low.
   * @default 30
   */
  maxDelay?: number;

  /**
   * Extra delay (in milliseconds) to pause after sentence punctuation (. ! ? \n).
   * Creates a natural reading cadence.
   * Set to 0 to disable.
   * @default 60
   */
  punctuationPause?: number;

  /**
   * Emitting mode:
   * - "char": Emit character by character (smooth classic typewriter).
   * - "word": Emit word by word (faster, modern terminal style).
   * @default "char"
   */
  mode?: "char" | "word";

  /**
   * Maximum allowed lag in characters before auto-speedup triggers.
   * When the buffer exceeds this threshold, typing speeds up to catch up.
   * @default 50
   */
  maxBufferThreshold?: number;

  /**
   * Callback fired whenever new text is displayed.
   * @param fullText The entire accumulated text so far.
   * @param newChunk The newly emitted piece of text (char or word).
   */
  onText?: (fullText: string, newChunk: string) => void;

  /**
   * Callback fired when the stream has ended and all buffered characters have been typed out.
   */
  onComplete?: () => void;
}

/**
 * Options for the typeStream helper function.
 */
export interface TypeStreamOptions extends StreamTyperOptions {
  /**
   * Text decoder to use when stream yields Uint8Array chunks.
   * @default new TextDecoder()
   */
  decoder?: { decode: (input?: BufferSource, options?: { stream?: boolean }) => string };
}
