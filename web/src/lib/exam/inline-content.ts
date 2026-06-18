import type { CompletionLine, CompletionLineStyle, Gap, InlineNode } from "@/lib/exam/types";

export const COMPLETION_LINE_STYLES: {
  value: CompletionLineStyle;
  label: string;
}[] = [
  { value: "normal", label: "Body line" },
  { value: "heading", label: "Section heading" },
  { value: "subheading", label: "Subheading" },
  { value: "bullet", label: "Bullet line" },
];

export function isTextSpan(node: InlineNode): node is Extract<InlineNode, { type: "text" }> {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type?: string }).type === "text"
  );
}

export function isGapNode(node: InlineNode): node is Gap {
  return typeof node === "object" && node !== null && "n" in node && !isTextSpan(node);
}

export function textNode(value: string, bold = false): InlineNode {
  if (!bold) return value;
  return { type: "text", value, bold: true };
}

export function gapNode(n: number): Gap {
  return { n };
}

/** Coerce legacy `InlineNode[][]` or `CompletionLine[]` into structured lines. */
export function normalizeCompletionLines(raw: unknown): CompletionLine[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((line) => {
    if (Array.isArray(line)) {
      return { style: "normal" as const, nodes: line as InlineNode[] };
    }
    if (line && typeof line === "object" && "nodes" in line) {
      const row = line as CompletionLine;
      return {
        style: row.style ?? "normal",
        nodes: Array.isArray(row.nodes) ? row.nodes : [],
      };
    }
    return { style: "normal" as const, nodes: [] };
  });
}

export function completionLineNodes(line: CompletionLine | InlineNode[]): InlineNode[] {
  return Array.isArray(line) ? line : line.nodes;
}

export function gapsInCompletionLines(lines: CompletionLine[]): number[] {
  const nums: number[] = [];
  for (const line of Array.isArray(lines) ? lines : []) {
    for (const node of Array.isArray(line?.nodes) ? line.nodes : []) {
      if (isGapNode(node)) nums.push(node.n);
    }
  }
  return nums;
}

export function renumberCompletionLines(
  lines: CompletionLine[],
  nums: number[],
  idx: { i: number },
): CompletionLine[] {
  return lines.map((line) => ({
    ...line,
    nodes: line.nodes.map((node) => {
      if (!isGapNode(node)) return node;
      const n = nums[idx.i] ?? node.n;
      idx.i += 1;
      return { ...node, n };
    }),
  }));
}

export function nextGapNumber(lines: CompletionLine[]): number {
  const nums = gapsInCompletionLines(lines);
  return (nums.at(-1) ?? 0) + 1;
}

export function lineHasGap(line: CompletionLine): boolean {
  return line.nodes.some((node) => isGapNode(node));
}

export function completionLineClass(style: CompletionLineStyle | undefined): string {
  switch (style) {
    case "heading":
      return "mt-3 text-[15px] font-bold text-navy first:mt-0";
    case "subheading":
      return "mt-2 text-[14px] font-semibold text-slate-800";
    case "bullet":
      return "flex flex-wrap items-center pl-1 text-[15px] leading-9 text-slate-700 before:mr-2 before:font-bold before:text-slate-500 before:content-['•']";
    default:
      return "flex flex-wrap items-center text-[15px] leading-9 text-slate-700";
  }
}

export function emptyCompletionLine(withGap = false, gapN = 1): CompletionLine {
  if (!withGap) {
    return { style: "heading", nodes: [""] };
  }
  return { style: "normal", nodes: ["", gapNode(gapN)] };
}
