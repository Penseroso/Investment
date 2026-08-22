import assert from "node:assert/strict";
import test from "node:test";
import {
  readJsonBody,
  RequestValidationError,
  requireSameOrigin,
} from "../lib/server/request-security";

test("rejects mutation requests without a same-origin Origin header", () => {
  assert.throws(
    () => requireSameOrigin(new Request("https://desk.example/api/risk", { method: "POST" })),
    (error: unknown) =>
      error instanceof RequestValidationError && error.status === 403,
  );
});

test("rejects cross-origin mutation requests", () => {
  assert.throws(
    () =>
      requireSameOrigin(
        new Request("https://desk.example/api/risk", {
          method: "POST",
          headers: { Origin: "https://attacker.example" },
        }),
      ),
    (error: unknown) =>
      error instanceof RequestValidationError && error.status === 403,
  );
});

test("accepts a bounded same-origin JSON request", async () => {
  const body = await readJsonBody<{ action: string }>(
    new Request("https://desk.example/api/risk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://desk.example",
      },
      body: JSON.stringify({ action: "refresh" }),
    }),
  );
  assert.deepEqual(body, { action: "refresh" });
});

test("rejects oversized JSON requests", async () => {
  await assert.rejects(
    readJsonBody(
      new Request("https://desk.example/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://desk.example",
        },
        body: JSON.stringify({ name: "x".repeat(17_000) }),
      }),
    ),
    (error: unknown) =>
      error instanceof RequestValidationError && error.status === 413,
  );
});
