import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Playground",
  description: "Design, prototyping, and typographic experiments, big and small.",
};

export default function PlayPage() {
  return <PageShell contentKey="play" />;
}
