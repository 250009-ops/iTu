"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnswerKeyField } from "@/components/admin/content/forms/answer-key-field";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { Gap, InlineNode, TableCompletionGroup } from "@/lib/exam/types";

type Props = {
  group: TableCompletionGroup;
  answerKey: AnswerKeyMap;
  onChange: (group: TableCompletionGroup) => void;
  onAnswerKeyChange: (key: AnswerKeyMap) => void;
};

function gapsInCell(cell: InlineNode[]): Gap[] {
  return cell.filter((n): n is Gap => typeof n === "object");
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

  function updateRow(rowIdx: number, row: InlineNode[][]) {
    const rows = [...group.rows];
    rows[rowIdx] = row;
    onChange({ ...group, rows });
  }

  function recomputeRange(rows: InlineNode[][][]) {
    const nums = rows.flatMap((row) =>
      row.flatMap((cell) => gapsInCell(cell).map((g) => g.n)),
    );
    if (nums.length === 0) return group;
    return {
      ...group,
      rows,
      from: nums[0]!,
      to: nums[nums.length - 1]!,
    };
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
                    rows: rows.length ? rows : [[[""]]],
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
              updateColumns([...group.columns, `Column ${group.columns.length + 1}`]);
              onChange({
                ...group,
                columns: [...group.columns, `Column ${group.columns.length + 1}`],
                rows: group.rows.map((row) => [...row, [""]]),
              });
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Column
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              {group.columns.map((col, i) => (
                <th key={i} className="border-b border-border px-3 py-2 text-left font-semibold text-navy">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-border last:border-0">
                {row.map((cell, colIdx) => {
                  const gaps = gapsInCell(cell);
                  const text = cell.filter((n): n is string => typeof n === "string").join(" ");
                  return (
                    <td key={colIdx} className="px-3 py-2 align-top">
                      <Input
                        value={text}
                        onChange={(e) => {
                          const newRow = row.map((c, i) => {
                            if (i !== colIdx) return c;
                            const rebuilt: InlineNode[] = [e.target.value];
                            for (const g of gaps) rebuilt.push(g);
                            return rebuilt;
                          });
                          updateRow(rowIdx, newRow);
                        }}
                        className="mb-1 h-8 text-xs"
                        placeholder="Cell text"
                      />
                      {gaps.map((gap) => (
                        <div key={gap.n} className="mt-1 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-navy text-[10px] font-bold text-white">
                            {gap.n}
                          </span>
                          <AnswerKeyField
                            questionNumber={gap.n}
                            answerKey={answerKey}
                            onChange={onAnswerKeyChange}
                          />
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-1 h-7 text-xs"
                        onClick={() => {
                          const maxN = group.rows
                            .flatMap((r) => r.flatMap((c) => gapsInCell(c)))
                            .at(-1)?.n ?? group.from - 1;
                          const n = maxN + 1;
                          const newRow = row.map((c, i) => {
                            if (i !== colIdx) return c;
                            return [...c, { n }];
                          });
                          onChange(recomputeRange(group.rows.map((r, i) => (i === rowIdx ? newRow : r))));
                        }}
                      >
                        <Plus className="h-3 w-3" /> Gap
                      </Button>
                    </td>
                  );
                })}
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
            const emptyRow = group.columns.map(() => [""] as InlineNode[]);
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
            onClick={() => onChange(recomputeRange(group.rows.slice(0, -1)))}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove last row
          </Button>
        )}
      </div>
    </div>
  );
}
