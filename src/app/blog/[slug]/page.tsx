import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { posts } from "../posts";

const PROSE_CLASSES =
  "space-y-3 [&_p]:leading-relaxed [&_h2]:font-heading [&_h2]:text-base [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:text-foreground [&_table]:w-full [&_table]:text-xs [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-mono [&_th]:font-normal [&_th]:text-foreground [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:font-mono [&_img]:my-4 [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_img]:max-w-full";

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
    title: `${post.title} | Rene Nunez`,
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
        <h1 className="font-heading text-2xl tracking-tight mt-1">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-4">
          {post.summary}
        </p>
        <div
          className={`mt-8 text-sm text-muted-foreground leading-relaxed ${PROSE_CLASSES}`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
