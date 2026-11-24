import { classes } from "@/utils/react";
import { format } from "@/utils/string";
import { useEffect, useRef, useState } from "react";

interface TextInputProps {
  name: string;
  value: string;
  setValue: (value: string) => void;
  setValidity: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isValid: (value: string) => boolean;
  label: string | null;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  description?: string | null;
  /** What's wrong, under it once the donor has left it invalid. */
  errorText?: string | null;
}

/** A required field's message: "<%= field %> is required", by its label. */
export function requiredText(
  template: string | null | undefined,
  label: string | null,
) {
  return template && label ? format(template, { field: label }) : null;
}

export default function TextInput({
  name,
  value,
  setValue,
  setValidity,
  isValid,
  label,
  placeholder,
  autoComplete,
  autoFocus = false,
  maxLength,
  description,
  errorText,
}: TextInputProps) {
  // Judged when the donor leaves it, never while they type: typing hides
  // what was wrong until they leave it again.
  const [error, setError] = useState(false);
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;
  const describedBy = [
    error && errorText ? errorId : "",
    description ? descriptionId : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Use a ref so the effect can always call the latest isValid without
  // being sensitive to inline function identity changes at the call site.
  // Sync is done in an effect (not during render) to satisfy react-hooks/refs.
  const isValidRef = useRef(isValid);
  useEffect(() => {
    isValidRef.current = isValid;
  });

  useEffect(() => {
    setValidity((ready) => ({ ...ready, [name]: isValidRef.current(value) }));
  }, [value, name, setValidity]);

  return (
    <div className="">
      <label
        htmlFor={name}
        className="block text-sm leading-6 font-medium text-slate-900"
      >
        {label}
      </label>
      <div className="mt-2">
        <input
          type="text"
          name={name}
          id={name}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          className={classes(
            error
              ? "ring-red-500 focus:ring-red-500"
              : "ring-slate-400 focus:ring-primary-600",
            "block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-xs ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6",
          )}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
          onBlur={() => setError(!isValid(value))}
          aria-invalid={error || undefined}
          aria-describedby={describedBy || undefined}
          placeholder={placeholder}
        />
      </div>
      {error && errorText && (
        <p id={errorId} className="mt-2 text-sm text-red-700">
          {errorText}
        </p>
      )}
      {description && (
        <p id={descriptionId} className="mt-2 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}
