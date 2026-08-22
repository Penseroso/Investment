import ResearchDesk from "../components/research-desk";
import { starterCompanies, type Company } from "@/lib/companies";
import { listCompanies } from "@/lib/server/company-service";
import { attachSeedResearch } from "@/lib/server/company-research-seed";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  let companies: Company[] = attachSeedResearch(starterCompanies);
  try {
    companies = await listCompanies();
  } catch {
    // The static catalog keeps the workspace usable during local setup or a D1 outage.
  }
  return <ResearchDesk initialCompanies={companies} />;
}
