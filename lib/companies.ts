export type MetricCategory = "평가 배수" | "운영 지표" | "가치 동인";

export type MetricDefinition = {
  code: string;
  label: string;
  category: MetricCategory;
  definition: string;
  formulaDisplay?: string;
  interpretation: string;
  calculationKey?: string;
  definitionVersion?: number;
};

export type CompanyMetric = MetricDefinition & {
  whyItMatters: string;
};

export type ResearchSource = {
  id: string;
  sourceType: "10-K" | "20-F" | "IR";
  title: string;
  url: string;
  publishedAt: string;
};

export type BusinessLine = {
  id: string;
  name: string;
  description: string;
  revenueRole: string;
  endMarkets: string;
};

export type ResearchPoint = {
  id: string;
  kind: "value_driver" | "risk";
  title: string;
  description: string;
};

export type CompanyResearch = {
  businessModel: string;
  revenueModel: string;
  customerStructure: string;
  costStructure: string;
  capitalIntensity: string;
  asOfDate: string;
  sources: ResearchSource[];
  businessLines: BusinessLine[];
  valueDrivers: ResearchPoint[];
  risks: ResearchPoint[];
};

export type Company = {
  ticker: string;
  name: string;
  market: string;
  sector: string;
  summary: string;
  websiteUrl: string;
  cik: string;
  irUrl: string;
  filingForms: string[];
  secEnabled: boolean;
  metrics: CompanyMetric[];
  research?: CompanyResearch | null;
};

export const genericMetrics: CompanyMetric[] = [
  {
    code: "EARNINGS",
    label: "이익 성장",
    category: "운영 지표",
    whyItMatters: "매출 증가가 실제 이익 증가로 이어지는지 확인하기 위해 봅니다.",
    definition: "일정 기간의 영업이익 또는 순이익 증가율입니다.",
    formulaDisplay: "(당기 이익 - 전기 이익) ÷ 전기 이익 × 100",
    interpretation: "일회성 손익과 주식보상비용을 함께 확인해야 합니다.",
    calculationKey: "earnings_growth",
    definitionVersion: 1,
  },
  {
    code: "FCF",
    label: "FCF",
    category: "운영 지표",
    whyItMatters: "영업활동과 투자 이후 실제로 남는 현금을 확인하기 위해 봅니다.",
    definition: "사업 운영에 필요한 투자 이후 기업에 남는 잉여현금흐름입니다.",
    formulaDisplay: "영업활동현금흐름 - 자본적지출(CAPEX)",
    interpretation: "운전자본과 투자주기에 따라 단기 수치가 흔들릴 수 있습니다.",
    calculationKey: "free_cash_flow",
    definitionVersion: 1,
  },
];

export const starterCompanies: Company[] = [
  {
    ticker: "CEG",
    name: "Constellation Energy",
    market: "NASDAQ",
    sector: "전력 · 원자력",
    summary:
      "원자력·가스·지열 등 발전 자산과 기업·가정 대상 에너지 공급 사업을 결합한 미국의 경쟁 전력기업입니다.",
    websiteUrl: "https://www.constellationenergy.com/",
    cik: "0001868275",
    irUrl: "https://investor.constellationenergy.com/",
    filingForms: ["10-K", "10-Q", "8-K", "4"],
    secEnabled: true,
    metrics: [
      {
        code: "EV/EBITDA",
        label: "EV/EBITDA",
        category: "평가 배수",
        whyItMatters:
          "자본집약적인 발전 자산의 현금창출력을 자본구조 차이 없이 비교하기 위해 봅니다.",
        definition:
          "기업가치가 이자, 세금, 감가상각비 차감 전 이익의 몇 배인지 나타내는 지표입니다.",
        formulaDisplay: "기업가치(EV) ÷ EBITDA",
        calculationKey: "ev_to_ebitda",
        definitionVersion: 1,
        interpretation:
          "동종 발전사와 비교하되 전력가격, 원전 가동률, 정비비를 반영한 정상 EBITDA 기준을 사용해야 합니다.",
      },
      {
        code: "FCF_YIELD",
        label: "FCF Yield",
        category: "평가 배수",
        whyItMatters:
          "정비와 설비투자를 집행한 뒤 실제로 남는 현금이 주가를 얼마나 뒷받침하는지 보기 위해 봅니다.",
        definition:
          "주식의 시장가치 대비 잉여현금흐름 비율입니다. 현재 가격에서 얻는 현금 수익력을 나타냅니다.",
        formulaDisplay: "잉여현금흐름(FCF) ÷ 시가총액 × 100",
        calculationKey: "fcf_yield_market_cap",
        definitionVersion: 1,
        interpretation:
          "높을수록 가격 대비 현금창출력이 크지만 대규모 정비와 투자 시점에 따라 연간 수치가 크게 달라질 수 있습니다.",
      },
      {
        code: "CONTRACT_VIS",
        label: "계약 가시성",
        category: "가치 동인",
        whyItMatters:
          "장기 전력계약이 전력가격 변동을 줄이고 미래 현금흐름을 얼마나 확정하는지 보기 위해 확인합니다.",
        definition:
          "미래 발전량과 매출 중 장기 계약으로 가격과 물량이 정해진 범위를 뜻합니다.",
        interpretation:
          "계약 기간, 물량, 가격 조정 조건과 추가 설비투자 의무를 함께 확인해야 합니다.",
      },
    ],
  },
  {
    ticker: "COHR",
    name: "Coherent Corp.",
    market: "NYSE",
    sector: "광통신 · 포토닉스",
    summary:
      "데이터센터, 통신, 산업용 시장에 포토닉스 소재, 네트워킹 부품과 레이저를 공급하는 기업입니다.",
    websiteUrl: "https://www.coherent.com/",
    cik: "0000820318",
    irUrl: "https://investors.coherent.com/",
    filingForms: ["10-K", "10-Q", "8-K", "4"],
    secEnabled: true,
    metrics: [
      {
        code: "EV/SALES",
        label: "EV/Sales",
        category: "평가 배수",
        whyItMatters:
          "AI 데이터센터 수요가 아직 이익으로 충분히 전환되지 않은 구간에서 매출 대비 가격을 비교하기 위해 봅니다.",
        definition: "기업가치가 연간 매출의 몇 배인지 나타내는 지표입니다.",
        formulaDisplay: "기업가치(EV) ÷ 매출",
        calculationKey: "ev_to_sales",
        definitionVersion: 1,
        interpretation:
          "제품 믹스와 수익성이 다른 기업끼리는 같은 배수라도 의미가 다르므로 마진과 함께 봐야 합니다.",
      },
      {
        code: "EBITDA_MARGIN",
        label: "EBITDA Margin",
        category: "운영 지표",
        whyItMatters:
          "고성장 광통신 제품의 매출 증가가 실제 영업수익성 개선으로 이어지는지 확인하기 위해 봅니다.",
        definition: "매출 중 EBITDA로 남는 비율입니다.",
        formulaDisplay: "EBITDA ÷ 매출 × 100",
        calculationKey: "ebitda_margin",
        definitionVersion: 1,
        interpretation:
          "조정 항목이 많을 때는 GAAP 영업이익과 주식보상비용, 구조조정비를 함께 확인해야 합니다.",
      },
      {
        code: "FCF_CONVERSION",
        label: "FCF 전환율",
        category: "운영 지표",
        whyItMatters:
          "재고와 설비투자 부담을 거친 영업이익이 실제 현금으로 전환되는지 확인하기 위해 봅니다.",
        definition: "EBITDA 가운데 잉여현금흐름으로 전환된 비율입니다.",
        formulaDisplay: "잉여현금흐름(FCF) ÷ EBITDA × 100",
        calculationKey: "fcf_conversion",
        definitionVersion: 1,
        interpretation:
          "재고 축적, 고객 선급금과 설비투자 시점이 단기 전환율을 크게 움직일 수 있습니다.",
      },
    ],
  },
  {
    ticker: "TSM",
    name: "Taiwan Semiconductor",
    market: "NYSE ADR",
    sector: "반도체 파운드리",
    summary:
      "고객이 설계한 반도체를 제조하는 전용 파운드리 기업으로 HPC, 스마트폰, 자동차 등 다양한 시장을 지원합니다.",
    websiteUrl: "https://www.tsmc.com/english",
    cik: "0001046179",
    irUrl: "https://investor.tsmc.com/english",
    filingForms: ["20-F", "6-K", "SD"],
    secEnabled: true,
    metrics: [
      {
        code: "FORWARD_PE",
        label: "Forward P/E",
        category: "평가 배수",
        whyItMatters:
          "첨단 공정 성장 기대가 향후 이익 대비 현재 주가에 얼마나 반영됐는지 보기 위해 봅니다.",
        definition: "현재 주가가 향후 12개월 예상 주당순이익의 몇 배인지 나타냅니다.",
        formulaDisplay: "현재 주가 ÷ 향후 12개월 예상 EPS",
        calculationKey: "forward_pe",
        definitionVersion: 1,
        interpretation:
          "반도체 업황, 환율과 예상 이익의 기준 시점이 달라지면 배수도 빠르게 바뀔 수 있습니다.",
      },
      {
        code: "GROSS_MARGIN",
        label: "Gross Margin",
        category: "운영 지표",
        whyItMatters:
          "첨단 공정의 가격 결정력과 가동률이 실제 수익성으로 이어지는지 확인하기 위해 봅니다.",
        definition: "매출에서 매출원가를 차감한 뒤 남는 비율입니다.",
        formulaDisplay: "매출총이익 ÷ 매출 × 100",
        calculationKey: "gross_margin",
        definitionVersion: 1,
        interpretation:
          "공정 믹스, 가동률, 환율과 해외 팹 초기 비용이 단기 마진에 영향을 줍니다.",
      },
      {
        code: "CAPEX_INTENSITY",
        label: "CAPEX / 매출",
        category: "운영 지표",
        whyItMatters:
          "첨단 공정 경쟁력을 유지하는 데 필요한 재투자 부담이 매출에 비해 어느 정도인지 보기 위해 봅니다.",
        definition: "매출 대비 설비투자 규모를 나타내는 비율입니다.",
        formulaDisplay: "설비투자(CAPEX) ÷ 매출 × 100",
        calculationKey: "capex_intensity",
        definitionVersion: 1,
        interpretation:
          "투자와 매출 발생 시점이 다르므로 단일 연도보다 여러 해의 추세와 신규 팹 가동 계획을 함께 봐야 합니다.",
      },
    ],
  },
];
