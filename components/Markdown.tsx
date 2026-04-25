import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-4 text-sm leading-relaxed text-foreground/85",
        "[&_h1]:mt-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground",
        "[&_h2]:mt-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground",
        "[&_h3]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-strong",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        "[&_code]:rounded [&_code]:bg-black/30 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre>code]:bg-transparent [&_pre>code]:p-0",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-accent/50 [&_blockquote]:pl-3 [&_blockquote]:text-foreground/70",
        "[&_hr]:border-border",
        "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
