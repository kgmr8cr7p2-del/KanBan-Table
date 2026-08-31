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
