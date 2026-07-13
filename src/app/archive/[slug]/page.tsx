import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { getArchivePages, getPage } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return getArchivePages().map((p) => ({ slug: p.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const info = getPage(slug);
  return {
    title: info?.title ? `${info.title} (archived)` : "Archived page",
    robots: { index: false, follow: false },
  };
}

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PageShell contentKey={slug} />;
}
