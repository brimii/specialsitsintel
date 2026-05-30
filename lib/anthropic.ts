import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Lazy-instantiated client: no crash without a key (build / container).
let _client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is missing from the environment.");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// Default Sonnet — balanced quality/cost for structured extraction.
export const EXTRACTION_MODEL = "claude-sonnet-4-6";

// Tolerant JSON parser for Claude outputs. Strips markdown code fences and
// extracts the outermost JSON object/array if there's surrounding prose,
// because models occasionally ignore "respond with JSON only" instructions.
export function parseClaudeJson<T>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json|JSON)?\s*\r?\n?/, "").replace(/\r?\n?```\s*$/, "");
  }
  // If there's still prose around it, extract outermost {...} or [...]
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const start = s.search(/[{[]/);
    const lastBrace = s.lastIndexOf("}");
    const lastBracket = s.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
  }
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    console.error("[parseClaudeJson] failed:", (e as Error).message, "head:", s.slice(0, 200));
    return null;
  }
}
