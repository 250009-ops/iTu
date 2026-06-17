"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AnswerKeyField } from "@/components/admin/content/forms/answer-key-field";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import {
  COMPLETION_LINE_STYLES,
  emptyCompletionLine,
  gapNode,
  isGapNode,
  isTextSpan,
  nextGapNumber,
  textNode,
} from "@/lib/exam/inline-content";
import type { CompletionLine, CompletionLineStyle, InlineNode } from "@/lib/exam/types";

type Props = {
  lines: CompletionLine[];
  answerKey: AnswerKeyMap;
  onChange: (lines: CompletionLine[]) => void;
  onAnswerKeyChange: (k: AnswerKeyMap) => void;
  /** When "option", gap answer keys are letters from the word bank. */
  gapAnswerKeyType?: "text" | "option";
  gapAnswerKeyOptions?: string[];
};

export function CompletionLinesEditor({
  lines,
  answerKey,
  onChange,
  onAnswerKeyChange,
  gapAnswerKeyType = "text",
  gapAnswerKeyOptions,
}: Props) {
  function updateLine(lineIdx: number, patch: Partial<CompletionLine>) {
    const next = [...lines];
    next[lineIdx] = { ...next[lineIdx]!, ...patch };
    onChange(next);
  }

  function updateNodes(lineIdx: number, nodes: InlineNode[]) {
    updateLine(lineIdx, { nodes });
  }

  function removeLine(lineIdx: number) {
    onChange(lines.filter((_, i) => i !== lineIdx));
  }

  return (
    <div className="space-y-3">
      {lines.map((line, lineIdx) => (
        <div
          key={lineIdx}
          className="rounded-lg border border-border bg-white p-3 shadow-sm"
        >
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1 space-y-1">
              <Label className="text-xs">Line type</Label>
              <Select
                value={line.style ?? "normal"}
                onChange={(e) =>
                  updateLine(lineIdx, {
                    style: e.target.value as CompletionLineStyle,
                  })
                }
                className="h-9"
              >
                {COMPLETION_LINE_STYLES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 text-red-600"
              onClick={() => removeLine(lineIdx)}
              aria-label="Remove line"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-2">
            {line.nodes.map((node, nodeIdx) => (
              <SegmentRow
                key={`${lineIdx}-${nodeIdx}`}
                node={node}
                onChange={(next) => {
                  const nodes = [...line.nodes];
                  nodes[nodeIdx] = next;
                  updateNodes(lineIdx, nodes);
                }}
                onRemove={() => {
                  const nodes = line.nodes.filter((_, i) => i !== nodeIdx);
                  updateNodes(lineIdx, nodes.length > 0 ? nodes : [""]);
                }}
                answerKey={answerKey}
                onAnswerKeyChange={onAnswerKeyChange}
                gapAnswerKeyType={gapAnswerKeyType}
                gapAnswerKeyOptions={gapAnswerKeyOptions}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                updateNodes(lineIdx, [...line.nodes, ""])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Text
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const n = nextGapNumber(lines);
                updateNodes(lineIdx, [...line.nodes, gapNode(n)]);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Gap
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...lines, emptyCompletionLine(false)])}
        >
          <Plus className="h-3.5 w-3.5" /> Add label line
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const n = nextGapNumber(lines);
            onChange([...lines, emptyCompletionLine(true, n)]);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add line with gap
        </Button>
      </div>

      <p className="text-xs text-muted">
        Build each line from text and gap segments — e.g. &quot;emperor wore&quot; + gap 1 +
        &quot;silk indoors&quot;. Use section headings for labels like &quot;Early Uses&quot;.
        Toggle bold on text segments for emphasis.
      </p>
    </div>
  );
}

function SegmentRow({
  node,
  onChange,
  onRemove,
  answerKey,
  onAnswerKeyChange,
  gapAnswerKeyType = "text",
  gapAnswerKeyOptions,
}: {
  node: InlineNode;
  onChange: (node: InlineNode) => void;
  onRemove: () => void;
  answerKey: AnswerKeyMap;
  onAnswerKeyChange: (k: AnswerKeyMap) => void;
  gapAnswerKeyType?: "text" | "option";
  gapAnswerKeyOptions?: string[];
}) {
  if (isGapNode(node)) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-navy/30 bg-slate-50/80 px-2 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">
          {node.n}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Gap
        </span>
        <div className="min-w-0 flex-1">
          <AnswerKeyField
            questionNumber={node.n}
            answerKey={answerKey}
            onChange={onAnswerKeyChange}
            type={gapAnswerKeyType === "option" ? "option" : "text"}
            options={gapAnswerKeyOptions}
            allowAlternatives={gapAnswerKeyType !== "option"}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 shrink-0 text-red-600"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  const value = isTextSpan(node) ? node.value : node;
  const bold = isTextSpan(node) ? Boolean(node.bold) : false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(textNode(e.target.value, bold))}
        placeholder="Text before or after a gap"
        className="min-w-[12rem] flex-1"
      />
      <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-navy">
        <input
          type="checkbox"
          checked={bold}
          onChange={(e) => onChange(textNode(value, e.target.checked))}
          className="rounded border-border"
        />
        Bold
      </label>
      <Button
        variant="secondary"
        size="sm"
        className="h-9 shrink-0 text-red-600"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
