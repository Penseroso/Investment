import type { IrDocumentType } from "@/lib/research-contracts";

export type IrSourceSeed = {
  ticker: "CEG" | "COHR" | "TSM";
  adapterKey: "ceg_quarterly" | "cohr_financial_releases" | "tsm_official_paths";
  listingUrl: string;
  maxDocuments: number;
};

export type ParsedIrDocument = {
  documentType: IrDocumentType;
  title: string;
  url: string;
  publishedAt: string | null;
  sourceOrder: number;
};

export const irSourceSeeds: IrSourceSeed[] = [
  {
    ticker: "CEG",
    adapterKey: "ceg_quarterly",
    listingUrl:
      "https://investors.constellationenergy.com/financial-information/quarterly-results",
    maxDocuments: 24,
  },
  {
    ticker: "COHR",
    adapterKey: "cohr_financial_releases",
    listingUrl:
      "https://www.coherent.com/company/investor-relations/financial-releases",
    maxDocuments: 24,
  },
  {
    ticker: "TSM",
    adapterKey: "tsm_official_paths",
    listingUrl: "https://investor.tsmc.com/english",
    maxDocuments: 24,
  },
];

type Anchor = {
  text: string;
  url: string;
  index: number;
};

const monthPattern =
  "January|February|March|April|May|June|July|August|September|October|November|December";

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function plainText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function anchorsFromHtml(html: string, baseUrl: string): Anchor[] {
  const anchors: Anchor[] = [];
  const expression = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(expression)) {
    const text = plainText(match[3]);
    if (!text || /^(javascript:|mailto:|tel:|#)/i.test(match[2])) continue;
    try {
      const url = new URL(decodeHtml(match[2]), baseUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      anchors.push({
        text,
        url: url.toString(),
        index: match.index ?? 0,
      });
    } catch {
      // Ignore malformed links from third-party widgets.
    }
  }
  return anchors;
}

function dateFromText(value: string, preference: "first" | "last") {
  const expression = new RegExp(`(?:${monthPattern})\\s+\\d{1,2},?\\s+\\d{4}`, "gi");
  const matches = [...plainText(value).matchAll(expression)];
  const raw = preference === "first" ? matches[0]?.[0] : matches.at(-1)?.[0];
  if (!raw) return null;
  const parsed = new Date(raw.replace(/(\d),\s*(\d{4})$/, "$1, $2"));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function nearbyDate(html: string, index: number) {
  const after = dateFromText(html.slice(index, index + 700), "first");
  if (after) return after;
  return dateFromText(html.slice(Math.max(0, index - 700), index), "last");
}

function uniqueByUrl(documents: ParsedIrDocument[]) {
  return [
    ...new Map(
      documents.map((document) => [document.url.split("#")[0], document]),
    ).values(),
  ];
}

function parseCeg(html: string, source: IrSourceSeed) {
  return uniqueByUrl(
    anchorsFromHtml(html, source.listingUrl)
      .filter((anchor) =>
        /press release|earnings release|business and earnings outlook presentation|Q[1-4]\s+\d{4}.*presentation/i.test(
          anchor.text,
        ),
      )
      .map((anchor, sourceOrder) => ({
        documentType: /presentation/i.test(anchor.text)
          ? ("presentation" as const)
          : ("earnings_release" as const),
        title: anchor.text,
        url: anchor.url,
        publishedAt: nearbyDate(html, anchor.index),
        sourceOrder,
      })),
  );
}

function parseCohr(html: string, source: IrSourceSeed) {
  return uniqueByUrl(
    anchorsFromHtml(html, source.listingUrl)
      .filter((anchor) =>
        /financial results|fiscal year \d{4} results|analyst and investor day|technology innovation briefing/i.test(
          anchor.text,
        ),
      )
      .map((anchor, sourceOrder) => ({
        documentType: /investor day|briefing/i.test(anchor.text)
          ? ("event" as const)
          : ("earnings_release" as const),
        title: anchor.text,
        url: anchor.url,
        publishedAt: nearbyDate(html, anchor.index),
        sourceOrder,
      })),
  );
}

function parseTsm(_html: string, source: IrSourceSeed, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const latestCompletedQuarter = Math.floor((month - 1) / 3);
  let serial = year * 4 + latestCompletedQuarter - 1;
  if (now.getUTCDate() < 15 && [1, 4, 7, 10].includes(month)) serial -= 1;

  const documents: ParsedIrDocument[] = [
    {
      documentType: "monthly_revenue",
      title: `${year} Monthly Revenue`,
      url: `https://investor.tsmc.com/english/monthly-revenue/${year}`,
      publishedAt: null,
      sourceOrder: 0,
    },
  ];
  for (let index = 0; index < 6; index += 1) {
    const quarterSerial = serial - index;
    const quarterYear = Math.floor(quarterSerial / 4);
    const quarter = (quarterSerial % 4) + 1;
    documents.push({
      documentType: "quarterly_results",
      title: `TSMC ${quarterYear} Q${quarter} Quarterly Results`,
      url: `https://investor.tsmc.com/english/quarterly-results/${quarterYear}/q${quarter}`,
      publishedAt: null,
      sourceOrder: index + 1,
    });
  }
  return documents.slice(0, source.maxDocuments);
}

export function parseIrListing(source: IrSourceSeed, html: string, now = new Date()) {
  if (source.adapterKey === "ceg_quarterly") {
    return parseCeg(html, source).slice(0, source.maxDocuments);
  }
  if (source.adapterKey === "cohr_financial_releases") {
    return parseCohr(html, source).slice(0, source.maxDocuments);
  }
  return parseTsm(html, source, now).slice(0, source.maxDocuments);
}
