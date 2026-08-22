import type { Company } from "@/lib/companies";
import { listCompanies, saveCustomCompany } from "@/lib/server/company-service";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const databaseUnavailable =
    message.includes("no such table") || message.includes("binding `DB` is unavailable");

  return Response.json(
    {
      error: databaseUnavailable
        ? "기업 데이터베이스를 준비하지 못했습니다."
        : "기업 정보를 처리하지 못했습니다.",
    },
    { status: 500 },
  );
}

function safeExternalUrl(value: string | undefined) {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    return Response.json(
      { companies: await listCompanies() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<Company>;
    const ticker = payload.ticker?.trim().toUpperCase() ?? "";
    const name = payload.name?.trim().slice(0, 120) ?? "";
    if (!/^[A-Z0-9.-]{1,8}$/.test(ticker) || !name) {
      return Response.json({ error: "티커와 회사명을 확인해 주세요." }, { status: 400 });
    }

    const rawCik = String(payload.cik ?? "").replace(/\D/g, "").slice(0, 10);
    const company: Company = {
      ticker,
      name,
      market: "사용자 등록",
      sector: "분류 대기",
      summary: "기업 정보가 아직 등록되지 않았습니다.",
      websiteUrl: "",
      cik: rawCik ? rawCik.padStart(10, "0") : "",
      irUrl: safeExternalUrl(payload.irUrl),
      filingForms: ["10-K", "10-Q", "8-K", "20-F", "6-K"],
      secEnabled: false,
      metrics: [],
    };

    return Response.json(
      { companies: await saveCustomCompany(company) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
