"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-[var(--font-outfit)] mb-3 mt-4 text-xl font-bold text-white first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-[var(--font-outfit)] mb-2 mt-3 text-lg font-bold text-white first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-[var(--font-outfit)] mb-2 mt-3 text-base font-semibold text-white first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-white/80 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-4 list-disc space-y-1 text-sm text-white/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm text-white/80">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-white/70">{children}</em>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-xs text-accent-blue">
          {children}
        </code>
      );
    }
    return (
      <code className="block overflow-x-auto rounded-xl border border-white/5 bg-black/30 p-4 font-mono text-xs leading-relaxed text-emerald-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-hidden rounded-xl">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-accent-blue/40 pl-4 text-sm italic text-white/60">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-blue underline decoration-accent-blue/30 underline-offset-2 hover:decoration-accent-blue/60"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold text-white/60 uppercase">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody className="text-white/70">{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-white/5">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-2">{children}</td>,
  hr: () => <hr className="my-4 border-white/10" />,
};

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={`noteverse-markdown ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
