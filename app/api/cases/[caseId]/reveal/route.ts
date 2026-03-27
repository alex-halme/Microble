import { NextResponse } from "next/server";
import { getCaseReveal } from "@/lib/caseStore";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;
  const reveal = getCaseReveal(caseId);

  if (!reveal) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json(reveal);
}
