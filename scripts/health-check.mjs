const baseUrl = (process.env.APP_URL || process.env.HEALTHCHECK_URL || "http://localhost:3000").replace(/\/$/, "");

const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" }).catch((error) => {
  console.error(`[health] request failed: ${error.message}`);
  process.exit(1);
});
const payload = await response.json().catch(() => ({}));

if (!response.ok || payload.status !== "ok") {
  console.error(`[health] ${payload.status || "failed"}`, payload.checks || {});
  process.exit(1);
}

console.log(`[health] ok ${payload.checkedAt}`);
