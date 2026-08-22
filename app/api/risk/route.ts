import {
  listRisk,
  markRiskReportRead,
  riskStatus,
} from "@/lib/server/risk-service";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return Response.json(
      url.searchParams.get("mode") === "status"
        ? await riskStatus()
        : await listRisk(),
      { headers },
    );
  } catch {
    return Response.json({ error: "리스크 데이터를 불러오지 못했습니다." }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string; reportDate?: string };
    if (body.action === "read" && body.reportDate) {
      return Response.json(await markRiskReportRead(body.reportDate), { headers });
    }
    if (body.action === "refresh") {
      return Response.json(await listRisk({ forceRefresh: true }), { headers });
    }
    return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400, headers });
  } catch {
    return Response.json({ error: "리스크 요청을 처리하지 못했습니다." }, { status: 500, headers });
  }
}
