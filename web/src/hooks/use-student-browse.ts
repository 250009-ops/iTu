"use client";

import { useCallback, useEffect, useState } from "react";
import { listPackages } from "@/lib/api/catalog";
import { getErrorMessage } from "@/lib/api/errors";
import { mapBrowseProduct, type BrowseProduct } from "@/lib/api/mappers/student";

export function useStudentBrowse() {
  const [products, setProducts] = useState<BrowseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const packages = await listPackages();
      setProducts(packages.map(mapBrowseProduct));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load packages"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { products, loading, error, refresh };
}
