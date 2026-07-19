"use client";

import { Agentation } from "agentation";

/**
 * Development-only mount of the Agentation visual feedback toolbar.
 *
 * `endpoint` is the Agentation sync SERVER URL (see the toolbar's own docs, which
 * use `http://localhost:4747` as the example) — NOT the Next.js dev app origin.
 * Start it locally with `npx agentation-mcp server` (defaults to port 4747).
 * Override with `NEXT_PUBLIC_AGENTATION_ENDPOINT` if the server runs elsewhere.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT ?? "http://localhost:4747";

export default function AgentationToolbar() {
  return (
    <Agentation
      endpoint={ENDPOINT}
      onSessionCreated={(sessionId) => {
        console.log("Session started:", sessionId);
      }}
    />
  );
}
