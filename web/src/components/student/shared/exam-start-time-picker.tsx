"use client";

import { Input } from "@/components/ui/input";
import {
  EXAM_START_TIMES,
  getMockTimeValidationError,
  normalizeMockTimeInput,
} from "@/lib/student/exam-start-times";
import { cn } from "@/lib/utils";

type ExamStartTimePickerProps = {
  mockDate: string;
  mockTime: string;
  onMockTimeChange: (time: string) => void;
  className?: string;
};

export function ExamStartTimePicker({
  mockDate,
  mockTime,
  onMockTimeChange,
  className,
}: ExamStartTimePickerProps) {
  const validationError = getMockTimeValidationError(mockDate, mockTime);

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-navy">
        Exam start time
      </label>
      <div className="flex flex-wrap gap-2">
        {EXAM_START_TIMES.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => onMockTimeChange(time)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-semibold",
              mockTime === time
                ? "border-navy bg-navy text-white"
                : "border-border bg-white text-foreground hover:bg-slate-50",
            )}
          >
            {time}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <label
          htmlFor="exam-start-time-custom"
          className="mb-1.5 block text-xs font-medium text-muted"
        >
          Or enter your preferred time
        </label>
        <Input
          id="exam-start-time-custom"
          type="time"
          step={60}
          value={mockTime}
          onChange={(event) =>
            onMockTimeChange(normalizeMockTimeInput(event.target.value))
          }
          className="max-w-[10rem]"
        />
      </div>
      {validationError ? (
        <p className="mt-1.5 text-xs text-red-600">{validationError}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          Check-in opens 30 minutes before your start time.
        </p>
      )}
    </div>
  );
}
