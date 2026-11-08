import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

export function dateText(value: string) {
  return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3-$2-$1");
}

function parseDate(text: string) {
  if (!/^([0-9]{2})-([0-9]{2})-([0-9]{4})$/.test(text)) return "";
  const iso = text.split("-").reverse().join("-");
  const date = new Date(iso + "T00:00:00Z");
  return !iso.startsWith("0000") && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : "";
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

export function DateInput({ name, label, value, defaultValue, onChange, required, readOnly }: DateInputProps) {
  const [text, setText] = useState(dateText(value ?? defaultValue ?? ""));
  useEffect(() => {
    if (value !== undefined) setText(dateText(value));
  }, [value]);

  const iso = parseDate(text);

  return <>
    <input
      aria-label={label}
      type="text"
      placeholder="DD-MM-YYYY"
      maxLength={10}
      value={text}
      required={required}
      readOnly={readOnly}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setText(next);
        const date = parseDate(next);
        if (date || !next) onChange?.(date);
      }}
      ref={(input) => input?.setCustomValidity(text && !iso ? "Enter a valid date in DD-MM-YYYY format." : "")}
    />
    {name && <input type="hidden" name={name} value={iso} />}
  </>;
}

type DatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function DatePicker({ label, value, onChange, required }: DatePickerProps) {
  return (
    <span className="date-picker">
      <span className="date-picker-display" aria-hidden="true">
        {dateText(value) || "DD-MM-YYYY"}
        <CalendarDays size={16} />
      </span>
      <input
        type="date"
        aria-label={label}
        value={value}
        required={required}
        onChange={(event) => onChange(event.currentTarget.value)}
        onClick={(event) => {
          const input = event.currentTarget;
          if (typeof input.showPicker === "function") {
            input.showPicker();
          }
        }}
      />
    </span>
  );
}
