import type { CompanyResearch } from "@/lib/companies";

export const starterCompanyResearch: Record<string, CompanyResearch> = {
  CEG: {
    businessModel:
      "발전 자산에서 생산한 전력·용량·환경가치를 도매시장과 장기계약으로 판매하고, 별도의 소매 플랫폼을 통해 기업·공공·가정 고객에게 전력과 에너지 솔루션을 공급합니다. 발전과 고객 부하를 함께 보유해 양쪽의 가격 위험을 통합 관리합니다.",
    revenueModel:
      "전력 판매, 용량·보조서비스, 소매 전력 공급과 에너지 서비스가 주요 수익원입니다. 장기계약과 헤지로 현금흐름을 일부 고정하지만 발전량과 지역별 전력·가스 가격에도 노출됩니다.",
    customerStructure:
      "유틸리티·지자체·협동조합과 상업·산업·공공·주거 고객을 상대합니다. Calpine 합병 후 약 250만 고객 계정과 Fortune 100의 약 4분의 3을 고객으로 둔다고 회사가 공시했습니다.",
    costStructure:
      "연료와 구입전력, 원전 계획예방정비·핵연료, 가스발전 정비, 담보·헤지 비용, 인건비와 폐로 의무가 핵심 비용입니다. 발전소 가동률과 정비 일정이 단기 수익성을 크게 움직입니다.",
    capitalIntensity:
      "매우 높습니다. 원전 수명연장·출력증강, 정기 정비, 가스발전 유지보수와 신규 발전·저장 자산에 장기간 자본을 투입해야 합니다.",
    asOfDate: "2026-02-24",
    sources: [
      {
        id: "CEG_2025_10K",
        sourceType: "10-K",
        title: "Constellation Energy 2025 Form 10-K",
        url: "https://www.sec.gov/Archives/edgar/data/1868275/000186827526000032/ceg-20251231.htm",
        publishedAt: "2026-02-24",
      },
    ],
    businessLines: [
      {
        id: "CEG_CLEAN_GENERATION",
        name: "청정 기저 발전",
        description: "원자력 중심의 대규모 무탄소 발전과 수력·풍력·태양광 자산을 운영합니다.",
        revenueRole: "낮은 변동비의 발전량과 청정에너지 속성을 판매합니다.",
        endMarkets: "미국 도매 전력시장, 유틸리티, 대형 전력 수요처",
      },
      {
        id: "CEG_DISPATCHABLE_GENERATION",
        name: "조정 가능 발전",
        description: "Calpine 합병으로 가스발전·지열·배터리 자산이 추가돼 피크와 계통 신뢰도 수요에 대응합니다.",
        revenueRole: "전력·용량·보조서비스 가격과 가스 스프레드에서 수익을 얻습니다.",
        endMarkets: "텍사스, 캘리포니아, 미국 북동부 전력시장",
      },
      {
        id: "CEG_CUSTOMER_SOLUTIONS",
        name: "고객 공급·에너지 솔루션",
        description: "기업·공공·가정 고객에게 전력·가스와 지속가능성 솔루션을 제공합니다.",
        revenueRole: "소매 공급 마진과 장기 고객계약을 통해 발전 포트폴리오의 판매 채널을 확보합니다.",
        endMarkets: "상업·산업, 공공부문, 주거 고객",
      },
    ],
    valueDrivers: [
      { id: "CEG_DRIVER_AVAILABILITY", kind: "value_driver", title: "발전소 가동률", description: "원전과 가스발전의 계획·비계획 정지가 판매 가능 발전량과 마진을 결정합니다." },
      { id: "CEG_DRIVER_CONTRACT", kind: "value_driver", title: "전력계약과 수요 증가", description: "장기 전력계약, 데이터센터 부하와 지역별 용량가격이 현금흐름 가시성을 좌우합니다." },
      { id: "CEG_DRIVER_INTEGRATION", kind: "value_driver", title: "Calpine 통합", description: "발전·소매 포트폴리오 통합과 비용·상업 시너지가 합병의 가치 실현 속도를 결정합니다." },
    ],
    risks: [
      { id: "CEG_RISK_OPERATION", kind: "risk", title: "운영·규제", description: "원전 안전규제, 강제정지와 대규모 정비가 발전량과 비용에 직접 영향을 줍니다." },
      { id: "CEG_RISK_COMMODITY", kind: "risk", title: "전력·연료 가격", description: "지역별 전력가격, 천연가스 가격과 헤지·담보 요구가 수익성과 유동성을 흔들 수 있습니다." },
      { id: "CEG_RISK_INTEGRATION", kind: "risk", title: "합병 후 실행", description: "Calpine 통합, 부채와 자산 포트폴리오 변화가 예상 시너지와 자본배분을 제약할 수 있습니다." },
    ],
  },
  COHR: {
    businessModel:
      "소재 성장부터 광소자·트랜시버·레이저 시스템까지 수직 통합해 고성능 광학·포토닉스 부품을 제조하고 OEM과 최종 수요처에 판매합니다. 고객 시스템의 핵심 부품을 공동 설계·인증한 뒤 양산 공급하는 구조입니다.",
    revenueModel:
      "데이터센터·통신용 광트랜시버와 부품, 반도체·디스플레이 장비용 레이저·광학계, 산업·계측용 제품 판매가 대부분의 매출을 만듭니다. 제품 믹스와 고객 주문·인증 주기가 마진에 영향을 줍니다.",
    customerStructure:
      "전 세계 OEM과 최종 고객을 상대하며 기술영업이 설계·시험·인증을 지원합니다. FY2025에는 각각 매출 10%를 넘는 고객이 두 곳이어서 AI 네트워킹 고객 집중도를 함께 봐야 합니다.",
    costStructure:
      "화합물반도체와 특수소재 제조, IC·DSP·광학 부품 조달, 높은 R&D, 제조 수율과 글로벌 생산설비 고정비가 핵심입니다. 일부 레이저 소재·부품은 단일 또는 제한 공급원에 의존합니다.",
    capitalIntensity:
      "중상 수준입니다. InP·GaAs 등 소재와 소자 생산능력, 데이터센터 트랜시버 양산, 레이저 제조설비에 선행 투자가 필요하며 수요 조정기에는 가동률 부담이 발생합니다.",
    asOfDate: "2025-08-15",
    sources: [
      {
        id: "COHR_2025_10K",
        sourceType: "10-K",
        title: "Coherent FY2025 Form 10-K",
        url: "https://www.sec.gov/Archives/edgar/data/820318/000082031825000014/iivi-20250630.htm",
        publishedAt: "2025-08-15",
      },
    ],
    businessLines: [
      {
        id: "COHR_DATACENTER_COMMUNICATIONS",
        name: "Datacenter & Communications",
        description: "AI 데이터센터와 통신망에 트랜시버·광부품·모듈·서브시스템을 공급합니다.",
        revenueRole: "고속 광링크 채택과 대역폭 증가가 매출 성장과 믹스 개선을 이끕니다.",
        endMarkets: "AI 데이터센터, 클라우드, 통신장비",
      },
      {
        id: "COHR_INDUSTRIAL",
        name: "Industrial",
        description: "레이저·광학계·엔지니어드 소재를 반도체 장비, 정밀가공과 계측 분야에 공급합니다.",
        revenueRole: "다양한 산업 응용에서 장비 채택과 교체·증설 수요를 매출로 전환합니다.",
        endMarkets: "반도체·디스플레이 장비, 정밀 제조, 생명과학·과학계측",
      },
    ],
    valueDrivers: [
      { id: "COHR_DRIVER_AI", kind: "value_driver", title: "AI 광통신 수요", description: "고속 트랜시버 채택 속도와 주요 고객의 데이터센터 증설이 성장률을 결정합니다." },
      { id: "COHR_DRIVER_MARGIN", kind: "value_driver", title: "제품 믹스와 수율", description: "고부가 광부품 비중, 생산 수율과 가동률이 EBITDA 마진 개선으로 이어지는지가 중요합니다." },
      { id: "COHR_DRIVER_CASH", kind: "value_driver", title: "현금 전환과 부채", description: "재고·CAPEX 관리와 잉여현금흐름을 통한 부채 축소가 주주가치 회복의 핵심입니다." },
    ],
    risks: [
      { id: "COHR_RISK_CUSTOMER", kind: "risk", title: "고객 집중", description: "대형 고객의 주문 지연·내재화·벤더 다변화가 실적 변동을 키울 수 있습니다." },
      { id: "COHR_RISK_CYCLE", kind: "risk", title: "수요·재고 사이클", description: "통신과 산업 고객의 재고조정이 생산 가동률과 마진에 영향을 줍니다." },
      { id: "COHR_RISK_SUPPLY", kind: "risk", title: "제조·공급망", description: "제한 공급 소재와 복잡한 글로벌 생산망에서 수율·조달 문제가 발생할 수 있습니다." },
    ],
  },
  TSM: {
    businessModel:
      "고객이 설계한 반도체를 위탁 생산하는 전용 파운드리입니다. 자체 브랜드 칩으로 고객과 경쟁하지 않고 공정기술·대규모 생산능력·설계 생태계를 제공해 고객의 설계를 양산 제품으로 전환합니다.",
    revenueModel:
      "공정 노드별 웨이퍼 제조가 중심이며 설계지원·마스크, 첨단 패키징과 테스트 서비스가 결합됩니다. 선단공정과 HPC 비중, 웨이퍼 가격, 가동률과 수율이 매출과 마진을 결정합니다.",
    customerStructure:
      "팹리스, 시스템 기업과 IDM을 포함한 글로벌 반도체 고객을 직접 지원합니다. 2025년 상위 10개 고객이 매출의 78%, 최대 고객이 19%, 두 번째 고객이 17%를 차지했습니다.",
    costStructure:
      "팹 감가상각, 장비·소재·전력·용수, 인력과 선행 R&D가 주요 비용입니다. 첨단 노드와 해외 신규 팹의 초기 가동비가 단기 총마진을 낮출 수 있습니다.",
    capitalIntensity:
      "매우 높습니다. 2·3나노, 특수공정과 첨단 패키징 증설에 대규모 선행투자가 필요하며 회사는 2026년 CAPEX를 520억~560억 달러로 예상했습니다.",
    asOfDate: "2026-04-16",
    sources: [
      {
        id: "TSM_2025_20F",
        sourceType: "20-F",
        title: "TSMC 2025 Form 20-F",
        url: "https://www.sec.gov/Archives/edgar/data/1046179/000162828026025362/tsm-20251231.htm",
        publishedAt: "2026-04-16",
      },
    ],
    businessLines: [
      {
        id: "TSM_ADVANCED_LOGIC",
        name: "선단 로직 공정",
        description: "7나노 이하 로직 공정으로 AI·HPC와 스마트폰용 고성능 칩을 생산합니다.",
        revenueRole: "높은 기술 진입장벽과 단가로 성장과 수익성의 중심 역할을 합니다.",
        endMarkets: "AI·HPC, 스마트폰, 고성능 시스템 반도체",
      },
      {
        id: "TSM_SPECIALTY",
        name: "주류·특수 공정",
        description: "성숙 로직, RF, 혼합신호, 임베디드 메모리 등 다양한 공정을 제공합니다.",
        revenueRole: "넓은 고객·응용 기반으로 선단공정 외의 수요와 가동률을 보완합니다.",
        endMarkets: "자동차, IoT, 통신, 소비자·산업 전자",
      },
      {
        id: "TSM_PACKAGING_ECOSYSTEM",
        name: "첨단 패키징·설계 생태계",
        description: "3DFabric 패키징과 OIP 설계 인프라, 마스크·테스트 서비스를 제공합니다.",
        revenueRole: "AI 시스템의 통합 복잡도를 해결하며 웨이퍼 제조와 고객 락인을 강화합니다.",
        endMarkets: "AI 가속기, 칩렛·3D 적층, 첨단 시스템 설계",
      },
    ],
    valueDrivers: [
      { id: "TSM_DRIVER_AI", kind: "value_driver", title: "AI·HPC 수요", description: "AI 가속기와 고성능 컴퓨팅 수요가 선단공정과 첨단 패키징 성장의 중심입니다." },
      { id: "TSM_DRIVER_NODE", kind: "value_driver", title: "선단공정 전환", description: "2·3나노 양산 속도, 수율과 고객 채택이 매출 믹스와 가격 결정력을 좌우합니다." },
      { id: "TSM_DRIVER_UTILIZATION", kind: "value_driver", title: "가동률과 해외 팹 램프", description: "대규모 고정비 구조에서는 수요 대비 증설 속도와 신규 팹 가동효율이 마진에 중요합니다." },
    ],
    risks: [
      { id: "TSM_RISK_GEOPOLITICS", kind: "risk", title: "지정학·생산 집중", description: "대만 중심 생산과 미중 규제 변화가 운영 연속성과 고객 주문에 영향을 줄 수 있습니다." },
      { id: "TSM_RISK_CUSTOMER", kind: "risk", title: "고객 집중", description: "대형 고객의 제품 사이클, 자체 설계 변화와 주문 조정이 매출 변동을 키울 수 있습니다." },
      { id: "TSM_RISK_CAPEX", kind: "risk", title: "CAPEX·과잉설비", description: "수요보다 빠른 증설이나 해외 팹 비용 상승은 감가상각 부담과 자본수익률을 악화시킬 수 있습니다." },
    ],
  },
};

export function attachSeedResearch<T extends { ticker: string }>(companies: T[]) {
  return companies.map((company) => ({
    ...company,
    research: starterCompanyResearch[company.ticker] ?? null,
  }));
}
