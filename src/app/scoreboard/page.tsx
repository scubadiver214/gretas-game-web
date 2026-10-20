import { Suspense } from "react";
import Scoreboard from "@/features/scores/Scoreboard";

export default function ScoreboardPage() {
  // Suspense because the board reads ?mode= with useSearchParams().
  return (
    <Suspense>
      <Scoreboard />
    </Suspense>
  );
}
