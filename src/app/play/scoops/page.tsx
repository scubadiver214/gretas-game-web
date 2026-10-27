import type { Metadata } from "next";
import ScoopsGame from "@/features/scoops/ScoopsGame";

export const metadata: Metadata = { title: "Shelby's Scoops!" };

export default function ScoopsPage() {
  return <ScoopsGame />;
}
