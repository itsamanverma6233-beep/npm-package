import { StreamTyper } from "../dist/index.js";

// Simulated AI stream chunks with random latency
const aiResponseChunks = [
  "Hello there! ",
  "I am an AI assistant ",
  "streaming responses directly to your terminal.\n\n",
  "Notice how even if chunks arrive ",
  "in uneven bursts, ",
  "StreamTyper keeps the reading experience ",
  "silky smooth.\n\n",
  "It pauses naturally on punctuation. ",
  "And if the incoming buffer gets too large, ",
  "it automatically speeds up to catch up! 🚀\n"
];

console.log("\n--- Simulating AI Stream with ai-stream-typer ---\n");

let lastLength = 0;

const typer = new StreamTyper({
  minDelay: 15,
  maxDelay: 35,
  punctuationPause: 120,
  onText: (fullText) => {
    // Print newly emitted characters to the console
    const newChars = fullText.slice(lastLength);
    process.stdout.write(newChars);
    lastLength = fullText.length;
  },
  onComplete: () => {
    console.log("\n[Stream Complete]\n");
  }
});

// Feed chunks at erratic intervals like a real network connection
let delay = 0;
for (const chunk of aiResponseChunks) {
  delay += Math.floor(Math.random() * 250) + 80;
  setTimeout(() => {
    typer.feed(chunk);
  }, delay);
}

// Signal the stream has finished
setTimeout(() => {
  typer.end();
}, delay + 100);
