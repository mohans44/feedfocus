import { useCallback, useState } from "react";

export const useAiSummary = ({ fetchSummary }) => {
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiSummaryById, setAiSummaryById] = useState({});

  const hasSummary = useCallback(
    (articleId) =>
      Boolean(
        articleId &&
          aiSummaryById[articleId] &&
          !aiSummaryById[articleId].error
      ),
    [aiSummaryById],
  );

  const requestSummary = useCallback(
    async (articleId) => {
      if (!articleId) return null;
      if (hasSummary(articleId)) return aiSummaryById[articleId];
      setAiLoadingId(articleId);
      try {
        const data = await fetchSummary(articleId);
        setAiSummaryById((prev) => ({ ...prev, [articleId]: data }));
        return data;
      } finally {
        setAiLoadingId(null);
      }
    },
    [fetchSummary, hasSummary, aiSummaryById],
  );

  return {
    aiLoadingId,
    aiSummaryById,
    hasSummary,
    requestSummary,
  };
};
