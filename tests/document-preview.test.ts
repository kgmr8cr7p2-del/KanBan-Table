import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config";
import {
  csvPreview,
  decodeDocumentText,
  inlineDocumentMime,
} from "../src/lib/document-preview";
import {
  defaultSoundPreferences,
  parseSoundPreferences,
  shouldPlaySound,
} from "../src/lib/sound-preferences";

test("document content can be framed only by this site while pages stay protected", async () => {
  const rules = await nextConfig.headers!();
  const global = rules.find((rule) => rule.source === "/(.*)")!;
  const content = rules.find((rule) => rule.source === "/api/important-files/:id/content")!;
  assert.ok(content);
  const effective = new Map([...global.headers, ...content.headers].map(({ key, value }) => [key.toLowerCase(), value]));
  assert.equal(effective.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(effective.get("content-security-policy"), "default-src 'none'; frame-ancestors 'self'");
  assert.ok(global.headers.some(({ key, value }) => key === "Content-Security-Policy" && value.includes("frame-ancestors 'none'")));
});

test("CSV keeps quoted delimiters, escaped quotes and multiline cells", async () => {
  const result = await csvPreview(
    'Name;Description\nA;"a,b; c"\nB;"first\nsecond"\nC;"a ""quote"""',
  );
  assert.deepEqual(result.rows, [
    ["Name", "Description"],
    ["A", "a,b; c"],
    ["B", "first\nsecond"],
    ["C", 'a "quote"'],
  ]);
});
test("CSV comma delimiter is not confused by a quoted semicolon", async () => {
  const result = await csvPreview('"First; title",Second\n"One, two",Three');
  assert.deepEqual(result.rows, [
    ["First; title", "Second"],
    ["One, two", "Three"],
  ]);
});
test("CSV detects separators after a multiline header", async () => {
  assert.deepEqual((await csvPreview('"First\n title";Second\nA;B')).rows, [
    ["First\n title", "Second"],
    ["A", "B"],
  ]);
});
test("document text detects UTF-8, UTF-16 and legacy Cyrillic", () => {
  assert.equal(decodeDocumentText(Buffer.from("Привет")), "Привет");
  assert.equal(
    decodeDocumentText(
      Buffer.concat([
        Buffer.from([255, 254]),
        Buffer.from("Привет", "utf16le"),
      ]),
    ),
    "Привет",
  );
  assert.equal(
    decodeDocumentText(Buffer.from([207, 240, 232, 226, 229, 242])),
    "Привет",
  );
});
test("inline preview only serves matching safe media signatures", () => {
  assert.equal(
    inlineDocumentMime("document.pdf", Buffer.from("%PDF-1.7")),
    "application/pdf",
  );
  assert.equal(
    inlineDocumentMime("document.pdf", Buffer.from("<script>evil</script>")),
    null,
  );
  assert.equal(
    inlineDocumentMime("document.html", Buffer.from("%PDF-1.7")),
    null,
  );
  assert.equal(
    inlineDocumentMime(
      "image.png",
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ),
    "image/png",
  );
});
test("existing sound preferences acquire mascot defaults without losing volume", () => {
  const { prank, mascotEnabled, ...legacy } = defaultSoundPreferences;
  void prank;
  void mascotEnabled;
  const result = parseSoundPreferences({ ...legacy, volume: 0.25 });
  assert.equal(result.volume, 0.25);
  assert.equal(result.prank, true);
  assert.equal(result.mascotEnabled, true);
  assert.equal(shouldPlaySound({ ...result, prank: false }, "prank"), false);
});
