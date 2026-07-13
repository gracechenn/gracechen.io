import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "About",
  description:
    "Grace Chen designs interfaces that facilitate human connection at the intersection of craft, speed, and simplicity.",
};

export default function AboutPage() {
  return <PageShell contentKey="about" />;
}
