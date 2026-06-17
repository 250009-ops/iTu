"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ReadingHeadingsContextValue = {
  pickedHeadingId: string | null;
  setPickedHeadingId: (id: string | null) => void;
};

const ReadingHeadingsContext = createContext<ReadingHeadingsContextValue | null>(
  null,
);

export function ReadingHeadingsProvider({ children }: { children: ReactNode }) {
  const [pickedHeadingId, setPickedHeadingId] = useState<string | null>(null);
  const value = useMemo(
    () => ({ pickedHeadingId, setPickedHeadingId }),
    [pickedHeadingId],
  );
  return (
    <ReadingHeadingsContext.Provider value={value}>
      {children}
    </ReadingHeadingsContext.Provider>
  );
}

export function useReadingHeadings() {
  return useContext(ReadingHeadingsContext);
}
