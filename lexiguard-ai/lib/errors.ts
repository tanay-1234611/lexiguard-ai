import { NextResponse } from "next/server";

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  // Never log document content or credentials.
  console.error("Unhandled server error:", e instanceof Error ? e.name : "unknown");
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong on the server." } },
    { status: 500 }
  );
}
