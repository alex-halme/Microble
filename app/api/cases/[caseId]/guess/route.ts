import { NextRequest, NextResponse } from "next/server";
import { getCaseById } from "@/lib/caseStore";
import { ORGANISMS } from "@/lib/organisms";
import { getAcceptedOrganismIdsForCase } from "@/lib/caseAnswers";
import { matchGuess } from "@/lib/matcher";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;
  const caseData = getCaseById(caseId);

  if (!caseData) {
    return NextResponse.json({ ok: false, reason: "case_not_found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as { guess?: string };
  const guess = typeof payload.guess === "string" ? payload.guess.trim() : "";

  if (!guess) {
    return NextResponse.json({ ok: false, reason: "no_match" }, { status: 400 });
  }

  const result = matchGuess(guess, ORGANISMS);
  if (!result.matched) {
    return NextResponse.json({ ok: false, reason: result.reason });
  }

  const acceptedOrganismIds = getAcceptedOrganismIdsForCase(caseData);

  return NextResponse.json({
    ok: true,
    canonicalGuess: result.organism.canonical,
    correct: acceptedOrganismIds.includes(result.organism.id),
  });
}
