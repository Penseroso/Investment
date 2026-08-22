import {
  type Company,
  genericMetrics,
} from "@/lib/companies";

export interface CompanyRepository {
  list(): Promise<Company[]>;
  upsertCustom(company: Company): Promise<Company[]>;
}

export const apiCompanyRepository: CompanyRepository = {
  async list() {
    const response = await fetch("/api/companies", { cache: "no-store" });
    if (!response.ok) throw new Error("기업 목록을 불러오지 못했습니다.");
    const payload = (await response.json()) as { companies: Company[] };
    return payload.companies;
  },

  async upsertCustom(company) {
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });
    if (!response.ok) throw new Error("종목을 저장하지 못했습니다.");
    const payload = (await response.json()) as { companies: Company[] };
    return payload.companies;
  },
};

export function companyFromFormData(formData: FormData): Company {
  const ticker = String(formData.get("ticker") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const cikInput = String(formData.get("cik") || "").replace(/\D/g, "");
  const irUrl = String(formData.get("irUrl") || "").trim();

  return {
    ticker,
    name,
    market: "사용자 등록",
    sector: "분류 대기",
    summary: "기업 정보가 아직 등록되지 않았습니다.",
    websiteUrl: "",
    cik: cikInput ? cikInput.padStart(10, "0") : "",
    irUrl,
    filingForms: ["10-K", "10-Q", "8-K", "20-F", "6-K"],
    secEnabled: false,
    metrics: genericMetrics,
  };
}
