import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the calendar landing page", async () => {
  const response = await render("/");

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /FOMC/);
  assert.match(html, /주간/);
  assert.match(html, /월간/);
});

test("keeps the company research workspace at its own route", async () => {
  const response = await render("/research");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Business Model/);
  assert.match(html, /사업 구성/);
  assert.match(html, /구조적 위험/);
  assert.match(html, /CEG_2025_10K/);
});

test("renders the market risk ledger at its own route", async () => {
  const response = await render("/risk");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /리스크/);
  assert.match(html, /시장 리스크 신호/);
  assert.match(html, /OFR FSI/);
});
