import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  companyBusinessLines,
  companyMetricConfigs,
  companyResearchPoints,
  companyResearchProfiles,
  irSourceConfigs,
  metricDefinitions,
  researchSources,
} from "@/db/schema";
import {
  type Company,
  type CompanyMetric,
  type MetricCategory,
  genericMetrics,
  starterCompanies,
} from "@/lib/companies";
import { starterCompanyResearch } from "@/lib/server/company-research-seed";
import { irSourceSeeds } from "@/lib/server/ir-adapters";

const supportedCategories = new Set<MetricCategory>([
  "평가 배수",
  "운영 지표",
  "가치 동인",
]);

function collectSeedMetrics() {
  const metrics = [...starterCompanies.flatMap((company) => company.metrics), ...genericMetrics];
  return [...new Map(metrics.map((metric) => [metric.code, metric])).values()];
}

async function seedCatalogIfEmpty() {
  const db = await getDb();
  const existing = await db.select({ ticker: companies.ticker }).from(companies).limit(1);
  if (existing.length) return;

  for (const metric of collectSeedMetrics()) {
    await db
      .insert(metricDefinitions)
      .values({
        code: metric.code,
        label: metric.label,
        category: metric.category,
        definition: metric.definition,
        formulaDisplay: metric.formulaDisplay ?? null,
        interpretation: metric.interpretation,
        calculationKey: metric.calculationKey ?? null,
        definitionVersion: metric.definitionVersion ?? 1,
      })
      .onConflictDoNothing();
  }

  for (const [companyIndex, company] of starterCompanies.entries()) {
    await db
      .insert(companies)
      .values({
        ticker: company.ticker,
        name: company.name,
        market: company.market,
        sector: company.sector,
        summary: company.summary,
        websiteUrl: company.websiteUrl,
        cik: company.cik,
        irUrl: company.irUrl,
        filingForms: company.filingForms,
        secEnabled: company.secEnabled,
        sortOrder: companyIndex,
      })
      .onConflictDoNothing();

    for (const [metricIndex, metric] of company.metrics.entries()) {
      await db
        .insert(companyMetricConfigs)
        .values({
          companyTicker: company.ticker,
          metricCode: metric.code,
          whyItMatters: metric.whyItMatters,
          displayOrder: metricIndex,
          enabled: true,
        })
        .onConflictDoNothing();
    }
  }
}

async function ensureResearchSeeded() {
  const db = await getDb();
  const existing = await db
    .select({
      ticker: companyResearchProfiles.companyTicker,
      asOfDate: companyResearchProfiles.asOfDate,
    })
    .from(companyResearchProfiles);
  const existingVersions = new Map(existing.map((item) => [item.ticker, item.asOfDate]));

  for (const [ticker, research] of Object.entries(starterCompanyResearch)) {
    if (existingVersions.get(ticker) === research.asOfDate) continue;
    const companySeed = starterCompanies.find((company) => company.ticker === ticker);
    if (companySeed) {
      await db
        .update(companies)
        .set({ summary: companySeed.summary, updatedAt: new Date().toISOString() })
        .where(eq(companies.ticker, ticker));
    }

    for (const source of research.sources) {
      await db
        .insert(researchSources)
        .values({
          id: source.id,
          companyTicker: ticker,
          sourceType: source.sourceType,
          title: source.title,
          url: source.url,
          publishedAt: source.publishedAt,
        })
        .onConflictDoUpdate({
          target: researchSources.id,
          set: {
            sourceType: source.sourceType,
            title: source.title,
            url: source.url,
            publishedAt: source.publishedAt,
          },
        });
    }

    await db
      .insert(companyResearchProfiles)
      .values({
        companyTicker: ticker,
        businessModel: research.businessModel,
        revenueModel: research.revenueModel,
        customerStructure: research.customerStructure,
        costStructure: research.costStructure,
        capitalIntensity: research.capitalIntensity,
        asOfDate: research.asOfDate,
        sourceIds: research.sources.map((source) => source.id),
      })
      .onConflictDoUpdate({
        target: companyResearchProfiles.companyTicker,
        set: {
          businessModel: research.businessModel,
          revenueModel: research.revenueModel,
          customerStructure: research.customerStructure,
          costStructure: research.costStructure,
          capitalIntensity: research.capitalIntensity,
          asOfDate: research.asOfDate,
          sourceIds: research.sources.map((source) => source.id),
          updatedAt: new Date().toISOString(),
        },
      });

    for (const [index, line] of research.businessLines.entries()) {
      await db
        .insert(companyBusinessLines)
        .values({
          id: line.id,
          companyTicker: ticker,
          name: line.name,
          description: line.description,
          revenueRole: line.revenueRole,
          endMarkets: line.endMarkets,
          displayOrder: index,
        })
        .onConflictDoUpdate({
          target: companyBusinessLines.id,
          set: {
            name: line.name,
            description: line.description,
            revenueRole: line.revenueRole,
            endMarkets: line.endMarkets,
            displayOrder: index,
          },
        });
    }

    for (const point of [...research.valueDrivers, ...research.risks]) {
      const displayOrder =
        point.kind === "value_driver"
          ? research.valueDrivers.findIndex((item) => item.id === point.id)
          : research.risks.findIndex((item) => item.id === point.id);
      await db
        .insert(companyResearchPoints)
        .values({
          id: point.id,
          companyTicker: ticker,
          kind: point.kind,
          title: point.title,
          description: point.description,
          displayOrder,
        })
        .onConflictDoUpdate({
          target: companyResearchPoints.id,
          set: {
            kind: point.kind,
            title: point.title,
            description: point.description,
            displayOrder,
          },
        });
    }
  }
}

export async function ensureIrSourceConfigs() {
  await seedCatalogIfEmpty();
  const db = await getDb();
  for (const seed of irSourceSeeds) {
    await db
      .insert(irSourceConfigs)
      .values({
        companyTicker: seed.ticker,
        adapterKey: seed.adapterKey,
        listingUrl: seed.listingUrl,
        maxDocuments: seed.maxDocuments,
        enabled: true,
      })
      .onConflictDoUpdate({
        target: irSourceConfigs.companyTicker,
        set: {
          adapterKey: seed.adapterKey,
          listingUrl: seed.listingUrl,
          maxDocuments: seed.maxDocuments,
          enabled: true,
          updatedAt: new Date().toISOString(),
        },
      });
  }
}

export async function listCompanies(): Promise<Company[]> {
  await seedCatalogIfEmpty();
  await ensureResearchSeeded();
  await ensureIrSourceConfigs();
  const db = await getDb();
  const companyRows = await db
    .select()
    .from(companies)
    .orderBy(asc(companies.sortOrder), asc(companies.ticker));
  const metricRows = await db
    .select({
      companyTicker: companyMetricConfigs.companyTicker,
      whyItMatters: companyMetricConfigs.whyItMatters,
      displayOrder: companyMetricConfigs.displayOrder,
      code: metricDefinitions.code,
      label: metricDefinitions.label,
      category: metricDefinitions.category,
      definition: metricDefinitions.definition,
      formulaDisplay: metricDefinitions.formulaDisplay,
      interpretation: metricDefinitions.interpretation,
      calculationKey: metricDefinitions.calculationKey,
      definitionVersion: metricDefinitions.definitionVersion,
    })
    .from(companyMetricConfigs)
    .innerJoin(
      metricDefinitions,
      eq(companyMetricConfigs.metricCode, metricDefinitions.code),
    )
    .where(eq(companyMetricConfigs.enabled, true))
    .orderBy(
      asc(companyMetricConfigs.companyTicker),
      asc(companyMetricConfigs.displayOrder),
    );
  const profileRows = await db.select().from(companyResearchProfiles);
  const sourceRows = await db
    .select()
    .from(researchSources)
    .orderBy(asc(researchSources.publishedAt));
  const businessLineRows = await db
    .select()
    .from(companyBusinessLines)
    .orderBy(asc(companyBusinessLines.companyTicker), asc(companyBusinessLines.displayOrder));
  const researchPointRows = await db
    .select()
    .from(companyResearchPoints)
    .orderBy(asc(companyResearchPoints.companyTicker), asc(companyResearchPoints.displayOrder));

  const metricsByCompany = new Map<string, CompanyMetric[]>();
  for (const row of metricRows) {
    const category = supportedCategories.has(row.category as MetricCategory)
      ? (row.category as MetricCategory)
      : "운영 지표";
    const metric: CompanyMetric = {
      code: row.code,
      label: row.label,
      category,
      whyItMatters: row.whyItMatters,
      definition: row.definition,
      formulaDisplay: row.formulaDisplay ?? undefined,
      interpretation: row.interpretation,
      calculationKey: row.calculationKey ?? undefined,
      definitionVersion: row.definitionVersion,
    };
    const current = metricsByCompany.get(row.companyTicker) ?? [];
    current.push(metric);
    metricsByCompany.set(row.companyTicker, current);
  }

  return companyRows.map((company) => {
    const profile = profileRows.find((item) => item.companyTicker === company.ticker);
    const sources = profile
      ? sourceRows
          .filter((source) => profile.sourceIds.includes(source.id))
          .map((source) => ({
            id: source.id,
            sourceType: source.sourceType as "10-K" | "20-F" | "IR",
            title: source.title,
            url: source.url,
            publishedAt: source.publishedAt,
          }))
      : [];
    const points = researchPointRows.filter((item) => item.companyTicker === company.ticker);

    return {
      ticker: company.ticker,
      name: company.name,
      market: company.market,
      sector: company.sector,
      summary: company.summary,
      websiteUrl: company.websiteUrl,
      cik: company.cik,
      irUrl: company.irUrl,
      filingForms: company.filingForms,
      secEnabled: company.secEnabled,
      metrics: metricsByCompany.get(company.ticker) ?? [],
      research: profile
        ? {
            businessModel: profile.businessModel,
            revenueModel: profile.revenueModel,
            customerStructure: profile.customerStructure,
            costStructure: profile.costStructure,
            capitalIntensity: profile.capitalIntensity,
            asOfDate: profile.asOfDate,
            sources,
            businessLines: businessLineRows
              .filter((line) => line.companyTicker === company.ticker)
              .map((line) => ({
                id: line.id,
                name: line.name,
                description: line.description,
                revenueRole: line.revenueRole,
                endMarkets: line.endMarkets,
              })),
            valueDrivers: points
              .filter((point) => point.kind === "value_driver")
              .map((point) => ({
                id: point.id,
                kind: "value_driver" as const,
                title: point.title,
                description: point.description,
              })),
            risks: points
              .filter((point) => point.kind === "risk")
              .map((point) => ({
                id: point.id,
                kind: "risk" as const,
                title: point.title,
                description: point.description,
              })),
          }
        : null,
    };
  });
}

export async function getSecEnabledCompany(ticker: string) {
  await seedCatalogIfEmpty();
  const db = await getDb();
  const rows = await db
    .select({
      ticker: companies.ticker,
      name: companies.name,
      cik: companies.cik,
      filingForms: companies.filingForms,
    })
    .from(companies)
    .where(
      and(
        eq(companies.ticker, ticker.trim().toUpperCase()),
        eq(companies.secEnabled, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getCompanyRecord(ticker: string) {
  await seedCatalogIfEmpty();
  const db = await getDb();
  const rows = await db
    .select({
      ticker: companies.ticker,
      name: companies.name,
      irUrl: companies.irUrl,
    })
    .from(companies)
    .where(eq(companies.ticker, ticker.trim().toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveCustomCompany(company: Company): Promise<Company[]> {
  await seedCatalogIfEmpty();
  const db = await getDb();
  const existingStarter = starterCompanies.some((item) => item.ticker === company.ticker);
  if (existingStarter) return listCompanies();

  const [{ nextSortOrder }] = await db
    .select({ nextSortOrder: companies.sortOrder })
    .from(companies)
    .orderBy(desc(companies.sortOrder))
    .limit(1);

  await db
    .insert(companies)
    .values({
      ticker: company.ticker,
      name: company.name,
      market: "사용자 등록",
      sector: "분류 대기",
      summary: "기업 정보가 아직 등록되지 않았습니다.",
      websiteUrl: "",
      cik: company.cik,
      irUrl: company.irUrl,
      filingForms: company.filingForms,
      secEnabled: false,
      sortOrder: (nextSortOrder ?? 0) + 100,
    })
    .onConflictDoUpdate({
      target: companies.ticker,
      set: {
        name: company.name,
        cik: company.cik,
        irUrl: company.irUrl,
        updatedAt: new Date().toISOString(),
      },
    });

  for (const [metricIndex, metric] of genericMetrics.entries()) {
    await db
      .insert(companyMetricConfigs)
      .values({
        companyTicker: company.ticker,
        metricCode: metric.code,
        whyItMatters: metric.whyItMatters,
        displayOrder: metricIndex,
        enabled: true,
      })
      .onConflictDoNothing();
  }

  return listCompanies();
}
