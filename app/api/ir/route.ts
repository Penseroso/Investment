import {
  getIrDocumentFeed,
  IrIngestionError,
} from "@/lib/server/ir-ingestion-service";

function tickerFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
}

async function respond(request: Request, forceRefresh: boolean) {
  const ticker = tickerFromRequest(request);
  if (!ticker) return Response.json({ error: "ticker가 필요합니다." }, { status: 400 });

  try {
    return Response.json(await getIrDocumentFeed(ticker, { forceRefresh }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
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
