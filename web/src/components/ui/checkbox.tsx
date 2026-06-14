import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? (typeof label === "string" ? label : undefined);

    return (
      <label
        htmlFor={inputId}
        className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-muted", className)}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-navy focus:ring-navy/30"
          {...props}
        />
        <span className="leading-snug">{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
