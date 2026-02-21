"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useArticleLink } from "@/hooks/use-article-link";

interface ArticleHeadlineProps {
  children: React.ReactNode;
  /** Direct URL if known */
  url?: string;
  /** Article ID for on-click URL resolution */
  articleId?: number;
  className?: string;
}

export function ArticleHeadline({
  children,
  url,
  articleId,
  className = "",
}: ArticleHeadlineProps) {
  const { isClickable, isLoading, handleClick } = useArticleLink({
    url,
    articleId,
  });

  if (!isClickable) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-left cursor-pointer hover:text-amber-400 transition-colors ${className}`}
      title="Open source article"
    >
      <span className="flex-1">{children}</span>
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />
      ) : (
        <ExternalLink className="w-3.5 h-3.5 text-gray-500 shrink-0" />
      )}
    </button>
  );
}
