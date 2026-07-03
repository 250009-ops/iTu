"use client";

import { useRef } from "react";
import {
  handleEssayEditorKeyDown,
  useEssayEditor,
} from "@/hooks/use-essay-editor";

type Props = {
  value: string;
  onChange: (value: string) => void;
  textSizeClass: string;
  placeholder?: string;
  style?: React.CSSProperties;
};

export function EssayEditor({
  value,
  onChange,
  textSizeClass,
  placeholder,
  style,
}: Props) {
  const { text, onChange: edit, undo, redo, replaceRange } = useEssayEditor(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyEdit = (next: string, cursor?: number) => {
    edit(next);
    onChange(next);
    if (cursor != null) {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    }
  };

  return (
    <textarea
      ref={textareaRef}
      data-exam-writing-input
      value={text}
      onChange={(e) => applyEdit(e.target.value)}
      onKeyDown={(e) => handleEssayEditorKeyDown(e, undo, redo)}
      onPaste={(e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text/plain");
        if (!pasted) return;
        const el = e.currentTarget;
        const start = el.selectionStart ?? text.length;
        const end = el.selectionEnd ?? text.length;
        const next = replaceRange(start, end, pasted);
        applyEdit(next, start + pasted.length);
      }}
      onCut={(e) => {
        const el = e.currentTarget;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        if (start === end) return;
        e.preventDefault();
        const next = replaceRange(start, end, "");
        applyEdit(next, start);
        e.clipboardData.setData("text/plain", text.slice(start, end));
      }}
      spellCheck={false}
      placeholder={placeholder}
      className={`min-h-0 flex-1 resize-none px-6 py-5 leading-7 outline-none ${textSizeClass}`}
      style={style}
    />
  );
}
