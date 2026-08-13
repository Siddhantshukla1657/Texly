import { customAlphabet } from "nanoid";

// 12-character uppercase alphanumeric code without ambiguous characters (O, 0, I, 1)
const generateRawCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 12);

export interface GeneratedCode {
  rawCode: string; // "A2B3C4D5E6F7"
  formattedCode: string; // "A2B3-C4D5-E6F7"
}

/** Generate a clean, human-friendly access code in XXXX-XXXX-XXXX format */
export function generateAccessCode(): GeneratedCode {
  const raw = generateRawCode();
  const formatted = raw.match(/.{1,4}/g)?.join("-") || raw;
  return {
    rawCode: raw,
    formattedCode: formatted,
  };
}

/** Normalize input by removing all non-alphanumeric characters and converting to uppercase */
export function normalizeAccessCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Format a 12-character raw string as XXXX-XXXX-XXXX */
export function formatAccessCode(raw: string): string {
  const clean = normalizeAccessCode(raw);
  return clean.match(/.{1,4}/g)?.join("-") || clean;
}

/** Generate potential candidate strings to match against stored bcrypt hash */
export function getAccessCodeCandidates(inputCode: string): string[] {
  const candidates = new Set<string>();
  const trimmed = inputCode.trim();

  if (!trimmed) return [];

  // 1. Raw trimmed input as provided by user
  candidates.add(trimmed);

  // 2. Uppercase of trimmed input
  candidates.add(trimmed.toUpperCase());

  // 3. Lowercase of trimmed input
  candidates.add(trimmed.toLowerCase());

  // 4. Normalized string (no hyphens/spaces, uppercase)
  const normalized = normalizeAccessCode(trimmed);
  if (normalized) {
    candidates.add(normalized);

    // 5. Formatted XXXX-XXXX-XXXX version of normalized string
    const formatted = formatAccessCode(normalized);
    candidates.add(formatted);
  }

  return Array.from(candidates);
}
