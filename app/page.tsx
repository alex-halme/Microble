import { todayUTC } from "@/lib/dailyCase";
import { getCurrentDailyCase } from "@/lib/caseStore";
import GameBoard from "@/components/GameBoard";

export const dynamic = "force-dynamic";

export default function DailyPage() {
  const todayCase = getCurrentDailyCase();
  const date = todayUTC();

  return <GameBoard caseData={todayCase} mode="daily" date={date} />;
}
