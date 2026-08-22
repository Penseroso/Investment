const MAX_JSON_BODY_BYTES = 16 * 1024;

export class RequestValidationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  const expectedOrigin = new URL(request.url).origin;
  if (!origin || origin !== expectedOrigin) {
    throw new RequestValidationError("허용되지 않은 요청 출처입니다.", 403);
  }
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  requireSameOrigin(request);

  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new RequestValidationError("application/json 요청이 필요합니다.", 415);
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new RequestValidationError("요청 본문이 너무 큽니다.", 413);
  }

  if (!request.body) {
    throw new RequestValidationError("JSON 요청 본문이 필요합니다.", 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      throw new RequestValidationError("요청 본문이 너무 큽니다.", 413);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T;
  } catch {
    throw new RequestValidationError("올바른 JSON 요청이 아닙니다.", 400);
  }
}

export function requestValidationResponse(error: unknown) {
  if (!(error instanceof RequestValidationError)) return null;
  return Response.json({ error: error.message }, { status: error.status });
}
