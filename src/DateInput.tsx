import { useState } from "react";
import { CalendarDays } from "lucide-react";

export function dateText(value: string) {
  return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3-$2-$1");
}

type DateInputProps = {
  name?: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
};

export const DateInput = DatePicker;

export function DatePicker({ name, label, value, defaultValue, onChange, required, readOnly }: DateInputProps) {
  const [selected, setSelected] = useState(defaultValue ?? "");
  return (
    <span className="date-picker">
      <span className="date-picker-display" aria-hidden="true">
        {dateText(value ?? selected) || "DD-MM-YYYY"}
        <CalendarDays size={16} />
      </span>
      <input
        type="date"
        aria-label={label}
        name={name}
        value={value ?? selected}
        readOnly={readOnly}
        required={required}
        onChange={(event) => {
          setSelected(event.currentTarget.value);
          onChange?.(event.currentTarget.value);
        }}
        onClick={(event) => {
          const input = event.currentTarget;
          if (!readOnly && typeof input.showPicker === "function") {
            try { input.showPicker(); } catch { /* Native control remains available. */ }
          }
        }}
      />
    </span>
  );
}
