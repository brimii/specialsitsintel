import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Client paresseux : pas de crash sans clé (build / container sans env).
let _client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY manquant dans l'environnement.");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// Default Sonnet (équilibre qualité/coût pour extraction structurée).
export const EXTRACTION_MODEL = "claude-sonnet-4-6";
