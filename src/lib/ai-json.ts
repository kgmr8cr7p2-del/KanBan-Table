/**
 * DeepSeek JSON mode normally returns a plain JSON object, but a provider
 * response can still contain a markdown fence, a short preface, or a hidden
 * thinking block. Keep parsing tolerant at the integration boundary so the
 * UI can still show a useful answer instead of failing the whole request.
 */
export function parseAiJson(content: string): unknown | null {
  const cleaned = stripAiWrappers(content);
  const candidates = [cleaned];
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(cleaned.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next common provider format before giving up.
    }
  }

  return null;
}

export function stripAiWrappers(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/**
 * Recover the answer field when JSON Output was cut off after the answer
 * (for example because recommendations made the completion too long).
 */
export function extractAiAnswer(content: string): string | null {
  const cleaned = stripAiWrappers(content);
  const key = /"answer"\s*:\s*"/i.exec(cleaned);
  if (!key) return null;

  const start = key.index + key[0].length;
  let value = "";
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const character = cleaned[index];
    if (escaped) {
      value += `\\${character}`;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') return decodeJsonString(value);
    value += character;
  }
  if (escaped) value += "\\";
  return decodeJsonString(value);
}

function decodeJsonString(value: string): string | null {
  try {
    const decoded = JSON.parse(`"${value}"`);
    return typeof decoded === "string" && decoded.trim() ? decoded.trim() : null;
  } catch {
    const fallback = value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .trim();
    return fallback || null;
  }
}
