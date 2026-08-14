import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "./posts";

export const metadata: Metadata = {
  title: "Blog | René Núñez",
  description:
    "Research notes and updates from building open sports prediction models.",
};

export default function BlogPage() {
  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8">
      <h1 className="font-heading text-2xl tracking-tight mb-6">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing published yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
            >
              <p className="font-mono text-xs text-muted-foreground">
                {post.date}
              </p>
              <h2 className="font-heading text-base tracking-tight mt-1 group-hover:underline underline-offset-4">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {post.summary}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
