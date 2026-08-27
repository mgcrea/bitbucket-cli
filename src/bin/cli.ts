#!/usr/bin/env node

import { loadJq } from "../output/jq.js";
import { loadClack } from "../prompt/load.js";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
};

const main = async (): Promise<void> => {
  const [action = "help", ...args] = process.argv.slice(2);

  switch (action) {
    case "--version": {
      console.log("0.0.0");
      break;
    }
    // M0 spike: proves jq-wasm loads and resolves its .wasm from inside the bundled
    // CJS artifact, not just under tsx.
    case "jq": {
      const expression = args[0] ?? ".";
      const input: unknown = JSON.parse(await readStdin());
      const jq = await loadJq();
      for (const line of await jq.run(input, expression)) {
        console.log(line);
      }
      break;
    }
    // M0 spike: proves the ESM-only @clack/prompts resolves from the CJS bin.
    case "clack": {
      const clack = await loadClack();
      console.log(typeof clack.text === "function" ? "clack-ok" : "clack-missing");
      break;
    }
    default: {
      console.log("Usage: bb <--version|jq <expr>|clack>");
    }
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
