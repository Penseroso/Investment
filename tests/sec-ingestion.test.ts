import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSubmission } from "../lib/server/sec-ingestion-service";

function recent(overrides: Partial<Record<string, unknown[]>> = {}) {
  return {
    accessionNumber: ["0000000001-26-000001"],
    filingDate: ["2026-08-21"],
    reportDate: ["2026-06-30"],
    acceptanceDateTime: ["2026-08-21T21:03:13Z"],
    act: ["34"],
    form: ["10-Q"],
    fileNumber: ["001-41137"],
    filmNumber: ["261305639"],
    items: ["2.02,9.01"],
    core_type: ["10-Q"],
    size: [5325],
    isXBRL: [1],
    isInlineXBRL: [1],
    isXBRLNumeric: [1],
    primaryDocument: ["report.htm"],
    primaryDocDescription: ["Quarterly report"],
    ...overrides,
  };
}

test("normalizes SEC provenance fields from current submissions", () => {
  const [document] = normalizeSubmission(
    "Example Corp",
    [{ recent: recent(), submissionFile: null }],
    { ticker: "EX", name: "Example", cik: "0000000001", filingForms: ["10-Q"] },
  );

  assert.equal(document.fileNumber, "001-41137");
  assert.deepEqual(document.items, ["2.02", "9.01"]);
  assert.equal(document.sizeBytes, 5325);
  assert.equal(document.isXbrl, true);
  assert.equal(document.isInlineXbrl, true);
  assert.deepEqual(document.sourceMetadata, { coreType: "10-Q", isXbrlNumeric: true });
});

test("includes allowed historical submission files and keeps newest filings first", () => {
  const documents = normalizeSubmission(
    "Example Corp",
    [
      { recent: recent(), submissionFile: null },
      {
        recent: recent({
          accessionNumber: ["0000000001-20-000001"],
          filingDate: ["2020-08-21"],
          acceptanceDateTime: ["2020-08-21T21:03:13Z"],
        }),
        submissionFile: "CIK0000000001-submissions-001.json",
      },
    ],
    { ticker: "EX", name: "Example", cik: "0000000001", filingForms: ["10-Q"] },
  );

  assert.equal(documents.length, 2);
  assert.equal(documents[0].submissionFile, null);
  assert.equal(documents[1].submissionFile, "CIK0000000001-submissions-001.json");
});
