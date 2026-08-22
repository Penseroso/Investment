"use client";

import { useEffect, useState } from "react";
import type { Company } from "@/lib/companies";
import {
  apiCompanyRepository,
  type CompanyRepository,
} from "../data/company-repository";

export function useCompanies(
  initialCompanies: Company[],
  repository: CompanyRepository = apiCompanyRepository,
) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);

  useEffect(() => {
    let active = true;
    void repository
      .list()
      .then((items) => {
        if (active && items.length) setCompanies(items);
      })
      .catch(() => {
        // Keep the server-rendered catalog if the refresh request fails.
      });
    return () => {
      active = false;
    };
  }, [repository]);

  async function saveCustomCompany(company: Company) {
    const items = await repository.upsertCustom(company);
    setCompanies(items);
  }

  return { companies, saveCustomCompany };
}
