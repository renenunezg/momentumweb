import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { posts } from "../posts";

// Markdown tables follow the same booktabs rules as the app's own tables:
// rule above the header, rule below it, rule at the foot, nothing between rows.
const PROSE_CLASSES =
  "space-y-4 [&_p]:leading-relaxed [&_h2]:font-heading [&_h2]:text-lg [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:font-semibold [&_table]:w-full [&_table]:text-xs [&_table]:my-5 [&_table]:border-collapse [&_thead]:border-y [&_thead]:border-rule-strong [&_tbody]:border-b [&_tbody]:border-rule-strong [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-mono [&_th]:font-normal [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground [&_td]:px-2 [&_td]:py-1.5 [&_td]:font-mono [&_img]:my-5 [&_img]:border [&_img]:border-border [&_img]:max-w-full";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | René Núñez`,
    description: post.summary,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8">
      <Link
        href="/blog"
        className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Blog
      </Link>
      <article className="mt-6">
        <p className="font-mono text-xs text-muted-foreground">{post.date}</p>
        <h1 className="font-heading text-3xl tracking-tight mt-1">
          {post.title}
        </h1>
        <p className="mt-4 max-w-[68ch] text-base text-muted-foreground leading-relaxed border-l border-rule-strong pl-4">
          {post.summary}
        </p>
        <div
          className={`mt-8 max-w-[68ch] text-base text-foreground leading-relaxed ${PROSE_CLASSES}`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
