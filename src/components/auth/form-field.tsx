import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Input> & {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
};

export function FormField({ label, name, errors, hint, id, ...props }: Props) {
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errors?.length);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} name={name} aria-invalid={hasError || undefined} aria-describedby={hasError ? errorId : undefined} {...props} />
      {hasError ? (
        <p id={errorId} className="text-xs text-destructive">
          {errors![0]}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
