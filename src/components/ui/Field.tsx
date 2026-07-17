import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const INPUT_CLASSES =
  "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none";

type FieldProps = {
  label: string;
  name: string;
  id?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, name, id, hint, className = "", ...rest }: FieldProps) {
  const fieldId = id ?? name;
  return (
    <div>
      <label className="block text-sm font-medium text-cream" htmlFor={fieldId}>
        {label}
      </label>
      <input id={fieldId} name={name} className={`${INPUT_CLASSES} ${className}`} {...rest} />
      {hint && <p className="mt-1 text-xs text-steel/70">{hint}</p>}
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  id?: string;
  hint?: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, name, id, hint, children, className = "", ...rest }: SelectFieldProps) {
  const fieldId = id ?? name;
  return (
    <div>
      <label className="block text-sm font-medium text-cream" htmlFor={fieldId}>
        {label}
      </label>
      <select id={fieldId} name={name} className={`${INPUT_CLASSES} ${className}`} {...rest}>
        {children}
      </select>
      {hint && <p className="mt-1 text-xs text-steel/70">{hint}</p>}
    </div>
  );
}

type TextareaFieldProps = {
  label: string;
  name: string;
  id?: string;
  hint?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({ label, name, id, hint, className = "", ...rest }: TextareaFieldProps) {
  const fieldId = id ?? name;
  return (
    <div>
      <label className="block text-sm font-medium text-cream" htmlFor={fieldId}>
        {label}
      </label>
      <textarea id={fieldId} name={name} className={`${INPUT_CLASSES} ${className}`} {...rest} />
      {hint && <p className="mt-1 text-xs text-steel/70">{hint}</p>}
    </div>
  );
}
