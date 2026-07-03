export type ReadingMarkKind = "highlight" | "note";

export type ReadingMark = {
  id: string;
  passageId: string;
  paragraphIndex: number;
  start: number;
  end: number;
  text: string;
  kind: ReadingMarkKind;
  noteText: string;
  createdAt: number;
};

export type PendingSelection = {
  passageId: string;
  paragraphIndex: number;
  start: number;
  end: number;
  text: string;
  rect: DOMRect;
};

export function marksStorageKey(sessionId: string) {
  return `reading-marks:${sessionId}`;
}

export function newMarkId() {
  return `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Offsets are relative to the `[data-passage-text]` span inside a paragraph. */
export function getPassageSelection(
  container: HTMLElement,
  passageId: string,
): PendingSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

  const range = sel.getRangeAt(0);
  const text = range.toString();
  if (!text.trim()) return null;

  const anchor =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : (range.commonAncestorContainer as Element);

  const textEl = anchor?.closest("[data-passage-text]");
  if (!textEl || !container.contains(textEl)) return null;

  const paraEl = textEl.closest("[data-passage-para]");
  if (!paraEl) return null;

  const paragraphIndex = Number(paraEl.getAttribute("data-passage-para"));
  if (Number.isNaN(paragraphIndex)) return null;

  const pre = document.createRange();
  pre.selectNodeContents(textEl);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const end = start + range.toString().length;

  return {
    passageId,
    paragraphIndex,
    start,
    end,
    text: range.toString(),
    rect: range.getBoundingClientRect(),
  };
}

export function marksForParagraph(
  marks: ReadingMark[],
  passageId: string,
  paragraphIndex: number,
): ReadingMark[] {
  return marks
    .filter(
      (m) => m.passageId === passageId && m.paragraphIndex === paragraphIndex,
    )
    .sort((a, b) => a.start - b.start);
}

export type MarkSegment =
  | { type: "text"; value: string }
  | { type: "mark"; value: string; mark: ReadingMark };

export function splitMarkedText(
  plainText: string,
  marks: ReadingMark[],
): MarkSegment[] {
  if (marks.length === 0) return [{ type: "text", value: plainText }];

  const segments: MarkSegment[] = [];
  let cursor = 0;

  for (const mark of marks) {
    if (mark.end <= cursor || mark.start >= plainText.length) continue;
    const start = Math.max(mark.start, cursor);
    const end = Math.min(mark.end, plainText.length);
    if (start > cursor) {
      segments.push({ type: "text", value: plainText.slice(cursor, start) });
    }
    segments.push({ type: "mark", value: plainText.slice(start, end), mark });
    cursor = end;
  }

  if (cursor < plainText.length) {
    segments.push({ type: "text", value: plainText.slice(cursor) });
  }
  return segments;
}
