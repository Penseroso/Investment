import {
  defaultCalendarRange,
  listCalendarEvents,
} from "@/lib/server/calendar-service";

function rangeFromRequest(request: Request) {
  const url = new URL(request.url);
  const defaults = defaultCalendarRange();
  return {
    from: url.searchParams.get("from") ?? defaults.from,
    to: url.searchParams.get("to") ?? defaults.to,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const invalidRange = message === "Invalid calendar range";
  return Response.json(
    {
      error: invalidRange
        ? "조회 기간을 확인해 주세요."
        : "일정 데이터를 불러오지 못했습니다.",
    },
    { status: invalidRange ? 400 : 500 },
  );
}

export async function GET(request: Request) {
  try {
    const range = rangeFromRequest(request);
    return Response.json(await listCalendarEvents(range), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const range = rangeFromRequest(request);
    return Response.json(
      await listCalendarEvents({ ...range, forceRefresh: true }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
