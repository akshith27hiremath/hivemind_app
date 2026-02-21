"use client";

import { useCallback, useState } from "react";
import { ARTICLE_LINKS_ENABLED } from "@/lib/intelligence/config";

// Module-level cache: article_id → resolved URL
const urlCache = new Map<number, string>();

interface UseArticleLinkOptions {
  /** Direct URL if already known (e.g., from Article type) */
  url?: string;
  /** Article ID for on-click resolution (e.g., from DigestItem) */
  articleId?: number;
}

export function useArticleLink({ url, articleId }: UseArticleLinkOptions) {
  const [isLoading, setIsLoading] = useState(false);

  const isClickable = ARTICLE_LINKS_ENABLED && Boolean(url || articleId);

  const handleClick = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!ARTICLE_LINKS_ENABLED) return;

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      if (articleId) {
        const cached = urlCache.get(articleId);
        if (cached) {
          window.open(cached, "_blank", "noopener,noreferrer");
          return;
        }

        setIsLoading(true);
        try {
          const res = await fetch(`/api/intelligence/articles/${articleId}`);
          if (res.ok) {
            const data = await res.json();
            const resolvedUrl = data?.data?.article?.url;
            if (resolvedUrl) {
              urlCache.set(articleId, resolvedUrl);
              window.open(resolvedUrl, "_blank", "noopener,noreferrer");
            }
          }
        } catch {
          // Silent failure
        } finally {
          setIsLoading(false);
        }
      }
    },
    [url, articleId]
  );

  return { isClickable, isLoading, handleClick };
}
