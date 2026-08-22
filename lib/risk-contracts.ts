export type RiskSignalKey =
  | "credit_stress"
  | "funding_stress"
  | "system_liquidity"
  | "equity_risk_off"
  | "financial_stress_composite";

export type RiskLevel = "normal" | "watch" | "warning" | "stress";
export type RiskTrend = "improving" | "stable" | "worsening";

export type RiskPoint = {
  date: string;
  value: number;
};

export type RiskSignal = {
  key: RiskSignalKey;
  label: string;
  role: string;
  asOfDate: string;
  value: number;
  unit: string;
  delta1: number | null;
  delta5: number | null;
  delta20: number | null;
  zScore: number | null;
  percentile: number;
  level: RiskLevel;
  trend: RiskTrend;
  sourceProvider: string;
  sourceUrl: string;
  dataFrequency: "daily" | "weekly";
  detail: Record<string, number | string | null>;
  calculatedAt: string;
};

export type RiskReport = {
  reportDate: string;
  overallLevel: RiskLevel;
  headline: string;
  summary: string;
  driverKeys: RiskSignalKey[];
  signalKeys: RiskSignalKey[];
  generatedAt: string;
  readAt: string | null;
};

export type RiskSourceState = {
  provider: string;
  status: "ready" | "unavailable";
};

export type RiskPayload = {
  report: RiskReport | null;
  signals: RiskSignal[];
  sources: RiskSourceState[];
  stale: boolean;
  fetchedAt: string;
};

export type RiskStatusPayload = {
  reportDate: string | null;
  overallLevel: RiskLevel | null;
  unread: boolean;
};

export const riskSignalOrder: RiskSignalKey[] = [
  "credit_stress",
  "funding_stress",
  "system_liquidity",
  "equity_risk_off",
  "financial_stress_composite",
];

export const riskSignalMeta: Record<
  RiskSignalKey,
  { label: string; role: string; stressDirection: 1 | -1 }
> = {
  credit_stress: {
    label: "Credit Stress",
    role: "하이일드 회사채의 위험 프리미엄",
    stressDirection: 1,
  },
  funding_stress: {
    label: "Repo / Funding Stress",
    role: "SOFR가 연준 지급금리를 웃도는 정도",
    stressDirection: 1,
  },
  system_liquidity: {
    label: "System Liquidity",
    role: "은행 준비금의 최근 4주 변화",
    stressDirection: -1,
  },
  equity_risk_off: {
    label: "Equity Volatility / Risk-Off",
    role: "단기 변동성이 3개월 변동성을 웃도는 정도",
    stressDirection: 1,
  },
  financial_stress_composite: {
    label: "Financial Stress Composite",
    role: "OFR이 집계한 글로벌 금융시장 스트레스",
    stressDirection: 1,
  },
};

const levelScore: Record<RiskLevel, number> = {
  normal: 0,
  watch: 1,
  warning: 2,
  stress: 3,
};

function scoreLevel(score: number): RiskLevel {
  if (score >= 3) return "stress";
  if (score >= 2) return "warning";
  if (score >= 1) return "watch";
  return "normal";
}

function percentileLevel(percentile: number) {
  if (percentile >= 99) return 3;
  if (percentile >= 95) return 2;
  if (percentile >= 85) return 1;
  return 0;
}

export function classifyRiskSignal(
  key: RiskSignalKey,
  value: number,
  stressPercentile: number,
): RiskLevel {
  let absoluteScore = 0;
  if (key === "credit_stress") {
    absoluteScore = value >= 7 ? 3 : value >= 5 ? 2 : value >= 4 ? 1 : 0;
  } else if (key === "funding_stress") {
    absoluteScore = value >= 35 ? 3 : value >= 20 ? 2 : value >= 10 ? 1 : 0;
  } else if (key === "system_liquidity") {
    absoluteScore = value <= -12 ? 3 : value <= -7 ? 2 : value <= -3 ? 1 : 0;
  } else if (key === "equity_risk_off") {
    absoluteScore = value >= 1.1 ? 3 : value >= 1 ? 2 : value >= 0.95 ? 1 : 0;
  } else {
    absoluteScore = value >= 2.5 ? 3 : value >= 1 ? 2 : value >= 0 ? 1 : 0;
  }
  return scoreLevel(Math.max(absoluteScore, percentileLevel(stressPercentile)));
}

export function calculateRiskSignal({
  key,
  series,
  unit,
  sourceProvider,
  sourceUrl,
  dataFrequency,
  detail = {},
  now = new Date(),
}: {
  key: RiskSignalKey;
  series: RiskPoint[];
  unit: string;
  sourceProvider: string;
  sourceUrl: string;
  dataFrequency: "daily" | "weekly";
  detail?: Record<string, number | string | null>;
  now?: Date;
}): RiskSignal {
  const clean = series
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!clean.length) throw new Error(`No observations for ${key}`);
  const values = clean.map((point) => point.value);
  const latest = clean.at(-1)!;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    Math.max(values.length - 1, 1);
  const deviation = Math.sqrt(variance);
  const rawPercentile =
    (values.filter((value) => value <= latest.value).length / values.length) * 100;
  const direction = riskSignalMeta[key].stressDirection;
  const stressPercentile = direction === 1 ? rawPercentile : 100 - rawPercentile;
  const previous = (offset: number) => clean.at(-(offset + 1))?.value ?? null;
  const difference = (offset: number) => {
    const prior = previous(offset);
    return prior === null ? null : latest.value - prior;
  };
  const delta5 = difference(5);
  const materialMove = Math.max(deviation * 0.1, Math.abs(latest.value) * 0.01, 0.01);
  const stressMove = (delta5 ?? 0) * direction;
  const trend: RiskTrend =
    delta5 === null || Math.abs(delta5) < materialMove
      ? "stable"
      : stressMove > 0
        ? "worsening"
        : "improving";

  return {
    key,
    label: riskSignalMeta[key].label,
    role: riskSignalMeta[key].role,
    asOfDate: latest.date,
    value: latest.value,
    unit,
    delta1: difference(1),
    delta5,
    delta20: difference(20),
    zScore: deviation > 0 ? (latest.value - average) / deviation : null,
    percentile: Math.max(0, Math.min(100, stressPercentile)),
    level: classifyRiskSignal(key, latest.value, stressPercentile),
    trend,
    sourceProvider,
    sourceUrl,
    dataFrequency,
    detail,
    calculatedAt: now.toISOString(),
  };
}

export function classifyOverallRisk(signals: RiskSignal[]): RiskLevel {
  const primary = signals.filter(
    (signal) => signal.key !== "financial_stress_composite",
  );
  const composite = signals.find(
    (signal) => signal.key === "financial_stress_composite",
  );
  const warningCount = primary.filter(
    (signal) => levelScore[signal.level] >= 2,
  ).length;
  const watchCount = primary.filter(
    (signal) => levelScore[signal.level] >= 1,
  ).length;
  const hasStress = primary.some((signal) => signal.level === "stress");
  const compositeConfirms = composite
    ? levelScore[composite.level] >= 2
    : false;

  if (warningCount >= 2 && compositeConfirms) return "stress";
  if (hasStress || warningCount >= 2) return "warning";
  if (watchCount >= 2 || compositeConfirms) return "watch";
  return "normal";
}

export function buildRiskReport(
  signals: RiskSignal[],
  reportDate: string,
  readAt: string | null = null,
  now = new Date(),
): RiskReport {
  const overallLevel = classifyOverallRisk(signals);
  const orderedDrivers = [...signals]
    .filter((signal) => signal.level !== "normal")
    .sort((a, b) => levelScore[b.level] - levelScore[a.level]);
  const headline: Record<RiskLevel, string> = {
    normal: "위험 신호가 여러 시장으로 확산되지는 않았습니다",
    watch: "일부 위험 신호가 평시 범위를 벗어났습니다",
    warning: "복수 시장에서 스트레스가 확인됩니다",
    stress: "시장 스트레스가 여러 영역으로 확산됐습니다",
  };
  const improving = signals.filter((signal) => signal.trend === "improving");
  const worsening = signals.filter((signal) => signal.trend === "worsening");
  const driverText = orderedDrivers.length
    ? `${orderedDrivers.slice(0, 2).map((signal) => signal.label).join("과 ")}을 우선 확인해야 합니다.`
    : "신용, 자금조달, 유동성, 주식 변동성의 독립 신호는 안정 범위입니다.";
  const trendText = worsening.length
    ? `${worsening.slice(0, 2).map((signal) => signal.label).join("과 ")}이 최근 관측치보다 악화됐습니다.`
    : improving.length
      ? `${improving.slice(0, 2).map((signal) => signal.label).join("과 ")}은 개선 방향입니다.`
      : "뚜렷한 단기 방향 변화는 없습니다.";

  return {
    reportDate,
    overallLevel,
    headline: headline[overallLevel],
    summary: `${driverText} ${trendText}`,
    driverKeys: orderedDrivers.slice(0, 3).map((signal) => signal.key),
    signalKeys: signals.map((signal) => signal.key),
    generatedAt: now.toISOString(),
    readAt,
  };
}
