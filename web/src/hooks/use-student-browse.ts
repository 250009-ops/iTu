"use client";

import { useCallback, useEffect, useState } from "react";
import { listStudentCatalogOffers } from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import { mapBrowseOffer, type BrowseOffer } from "@/lib/api/mappers/student";

export function useStudentBrowse() {
  const [offers, setOffers] = useState<BrowseOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalogOffers = await listStudentCatalogOffers();
      setOffers(catalogOffers.map(mapBrowseOffer));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load packages"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { offers, loading, error, refresh };
}
