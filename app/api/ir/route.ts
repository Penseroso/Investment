import {
  getIrDocumentFeed,
  IrIngestionError,
} from "@/lib/server/ir-ingestion-service";
import {
  requireSameOrigin,
  requestValidationResponse,
} from "@/lib/server/request-security";

function tickerFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
}

async function respond(request: Request, forceRefresh: boolean) {
  const ticker = tickerFromRequest(request);
  if (!/^[A-Z0-9.-]{1,8}$/.test(ticker)) {
    return Response.json({ error: "올바른 ticker가 필요합니다." }, { status: 400 });
  }

  try {
    if (forceRefresh) requireSameOrigin(request);
    return Response.json(await getIrDocumentFeed(ticker, { forceRefresh }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const validationResponse = requestValidationResponse(error);
    if (validationResponse) return validationResponse;
    const unsupported =
      error instanceof IrIngestionError && error.code === "unsupported_company";
    return Response.json(
      {
        error: unsupported
          ? error.message
          : "IR 자료를 갱신하지 못했습니다. 저장된 자료는 변경되지 않았습니다.",
        code: error instanceof IrIngestionError ? error.code : "unknown_error",
      },
      { status: unsupported ? 400 : 502 },
    );
  }
}

export async function GET(request: Request) {
  return respond(request, false);
}

export async function POST(request: Request) {
  return respond(request, true);
}
