import { notFound } from "next/navigation";
import { getPage, getContentHtml } from "@/lib/content";
import { behaviorsFor } from "@/lib/pageBehaviors";
import PageBehaviors from "./PageBehaviors";

/**
 * Renders a migrated page: its cleaned, self-contained Webflow markup injected as
 * static HTML, plus the small set of re-authored client behaviors for that page.
 * Using injected HTML keeps these design-heavy pages pixel-faithful to the
 * original export without hand-porting thousands of inline styles.
 */
export default function PageShell({ contentKey }: { contentKey: string }) {
  const info = getPage(contentKey);
  if (!info) notFound();
  const html = getContentHtml(info.file);
  const behaviors = behaviorsFor(info.key);
  return (
    <>
      <div className={info.bodyClass || undefined} dangerouslySetInnerHTML={{ __html: html }} />
      <PageBehaviors behaviors={behaviors} />
    </>
  );
}
