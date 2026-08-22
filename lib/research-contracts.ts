import type {
  Company,
  CompanyMetric,
  CompanyResearch,
  BusinessLine,
  MetricCategory,
  MetricDefinition,
  ResearchPoint,
  ResearchSource,
} from "./companies";

export type {
  BusinessLine,
  Company,
  CompanyMetric,
  CompanyResearch,
  MetricCategory,
  MetricDefinition,
  ResearchPoint,
  ResearchSource,
};

export type ResearchTab = "overview" | "valuation" | "filings" | "ir";

export type SecFiling = {
  form: string;
  filingDate: string;
  reportDate: string | null;
  acceptedAt: string | null;
  accession: string;
  title: string;
  url: string;
};

export type SecPayload = {
  companyName: string;
  cik: string;
  filings: SecFiling[];
  fetchedAt: string;
  source: "stored" | "refreshed";
  stale: boolean;
};

export type IrDocumentType =
  | "earnings_release"
  | "presentation"
  | "quarterly_results"
  | "monthly_revenue"
  | "event";

export type IrDocument = {
  id: string;
  documentType: IrDocumentType;
  title: string;
  url: string;
  publishedAt: string | null;
};

export type IrPayload = {
  companyName: string;
  documents: IrDocument[];
  fetchedAt: string;
  source: "stored" | "refreshed";
  stale: boolean;
};

export const researchTabs: { id: ResearchTab; label: string }[] = [
  { id: "overview", label: "개요" },
  { id: "valuation", label: "밸류에이션" },
  { id: "filings", label: "공시" },
  { id: "ir", label: "IR" },
];

export const metricCategoryOrder: MetricCategory[] = [
  "평가 배수",
  "운영 지표",
  "가치 동인",
];
