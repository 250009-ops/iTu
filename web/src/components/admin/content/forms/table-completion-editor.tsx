"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnswerKeyField } from "@/components/admin/content/forms/answer-key-field";
import { removeAnswerKeyEntry } from "@/lib/admin/content/match-editor-helpers";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import { gapNode, isGapNode, isTextSpan, textNode } from "@/lib/exam/inline-content";
import type { Gap, InlineNode, TableCompletionGroup } from "@/lib/exam/types";

type Props = {
  group: TableCompletionGroup;
  answerKey: AnswerKeyMap;
  onChange: (group: TableCompletionGroup) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
};

function gapsInCell(cell: InlineNode[]): Gap[] {
  return cell.filter((n): n is Gap => isGapNode(n));
}

function nextGapNumber(rows: InlineNode[][][]): number {
  const nums = rows.flatMap((row) =>
    row.flatMap((cell) => gapsInCell(cell).map((g) => g.n)),
  );
  return (nums.at(-1) ?? 0) + 1;
}

function gapNumbersInRow(row: InlineNode[][]): number[] {
  return row.flatMap((cell) => gapsInCell(cell).map((g) => g.n));
}

function TableCellEditor({
  cell,
  onChange,
  onAddGap,
  answerKey,
  onAnswerKeyChange,
}: {
  cell: InlineNode[];
  onChange: (nodes: InlineNode[]) => void;
  onAddGap: () => void;
  answerKey: AnswerKeyMap;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
}) {
  const nodes = cell.length > 0 ? cell : [];

  function removeSegment(nodeIdx: number) {
    const node = nodes[nodeIdx];
    if (node && isGapNode(node)) {
      onAnswerKeyChange(removeAnswerKeyEntry(answerKey, node.n));
    }
    const next = nodes.filter((_, i) => i !== nodeIdx);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {nodes.length === 0 ? (
        <p className="text-[11px] text-muted">No content — add text or a gap below.</p>
      ) : null}
      {nodes.map((node, nodeIdx) => (
        <TableCellSegmentRow
          key={`${nodeIdx}-${isGapNode(node) ? node.n : "text"}`}
          node={node}
          onChange={(next) => {
            const updated = [...nodes];
            updated[nodeIdx] = next;
            onChange(updated);
          }}
          onRemove={() => removeSegment(nodeIdx)}
          answerKey={answerKey}
          onAnswerKeyChange={onAnswerKeyChange}
        />
      ))}
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChange([...nodes, ""])}
        >
          <Plus className="h-3 w-3" /> Text
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 text-xs"
          onClick={onAddGap}
        >
          <Plus className="h-3 w-3" /> Gap
        </Button>
      </div>
    </div>
  );
}

function TableCellSegmentRow({
  node,
  onChange,
  onRemove,
  answerKey,
  onAnswerKeyChange,
}: {
  node: InlineNode;
  onChange: (node: InlineNode) => void;
  onRemove: () => void;
  answerKey: AnswerKeyMap;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
}) {
  if (isGapNode(node)) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-navy/30 bg-slate-50/80 px-2 py-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-navy text-[10px] font-bold text-white">
          {node.n}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Gap
        </span>
        <div className="min-w-0 flex-1">
          <AnswerKeyField
            questionNumber={node.n}
            answerKey={answerKey}
            onChange={onAnswerKeyChange}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 shrink-0 px-2 text-red-600"
          onClick={onRemove}
          aria-label={`Remove gap ${node.n}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const value = isTextSpan(node) ? node.value : node;

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(textNode(e.target.value))}
        placeholder="Cell text"
        className="h-8 flex-1 text-xs"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 shrink-0 px-2 text-red-600"
        onClick={onRemove}
        aria-label="Remove text"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function TableCompletionEditor({
  group,
  answerKey,
  onChange,
  onAnswerKeyChange,
}: Props) {
  function updateColumns(columns: string[]) {
    onChange({ ...group, columns });
  }

  function recomputeRange(rows: InlineNode[][][]) {
    const nums = rows.flatMap((row) =>
      row.flatMap((cell) => gapsInCell(cell).map((g) => g.n)),
    );
    if (nums.length === 0) return { ...group, rows, from: group.from, to: group.from };
    return {
      ...group,
      rows,
      from: nums[0]!,
      to: nums[nums.length - 1]!,
    };
  }

  function updateCell(rowIdx: number, colIdx: number, nodes: InlineNode[]) {
    const newRow = group.rows[rowIdx]!.map((cell, i) =>
      i === colIdx ? nodes : cell,
    );
    onChange(
      recomputeRange(group.rows.map((r, i) => (i === rowIdx ? newRow : r))),
    );
  }

  return (
    <div className="space-y-4">
      {group.title != null && (
        <Input
          value={group.title}
          onChange={(e) => onChange({ ...group, title: e.target.value })}
          placeholder="Table title"
        />
      )}

      <div className="space-y-2">
        <Label className="text-xs">Columns</Label>
        <div className="flex flex-wrap gap-2">
          {group.columns.map((col, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <Input
                value={col}
                onChange={(e) => {
                  const columns = [...group.columns];
                  columns[idx] = e.target.value;
                  updateColumns(columns);
                }}
                className="h-8 w-32 text-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-red-600"
                onClick={() => {
                  const columns = group.columns.filter((_, i) => i !== idx);
                  const rows = group.rows.map((row) => row.filter((_, i) => i !== idx));
                  onChange({
                    ...group,
                    columns: columns.length ? columns : ["Column 1"],
                    rows: rows.length ? rows : [[[]]],
                  });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onChange({
                ...group,
                columns: [...group.columns, `Column ${group.columns.length + 1}`],
                rows: group.rows.map((row) => [...row, []]),
              });
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Column
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted">
        Build each cell from text and gap segments in order — e.g. &quot;1977&quot; only, or
        &quot;finches were&quot; + gap + &quot;mm long&quot;. Remove any segment with the trash
        icon.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              {group.columns.map((col, i) => (
                <th
                  key={i}
                  className="border-b border-border px-3 py-2 text-left font-semibold text-navy"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-border last:border-0">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="px-3 py-2 align-top">
                    <TableCellEditor
                      cell={cell}
                      onChange={(nodes) => updateCell(rowIdx, colIdx, nodes)}
                      onAddGap={() => {
                        const n = nextGapNumber(group.rows);
                        updateCell(rowIdx, colIdx, [...cell, gapNode(n)]);
                      }}
                      answerKey={answerKey}
                      onAnswerKeyChange={onAnswerKeyChange}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const emptyRow = group.columns.map(() => [] as InlineNode[]);
            onChange(recomputeRange([...group.rows, emptyRow]));
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </Button>
        {group.rows.length > 1 && (
          <Button
            variant="secondary"
            size="sm"
            className="text-red-600"
            onClick={() => {
              const removedRow = group.rows[group.rows.length - 1];
              let nextKey = answerKey;
              for (const n of gapNumbersInRow(removedRow ?? [])) {
                nextKey = removeAnswerKeyEntry(nextKey, n);
              }
              onAnswerKeyChange(nextKey);
              onChange(recomputeRange(group.rows.slice(0, -1)));
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove last row
          </Button>
        )}
      </div>
    </div>
  );
}
