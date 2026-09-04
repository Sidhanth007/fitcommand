import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormAlert({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <Alert variant={error ? "destructive" : "default"} role="status">
      {error ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4 text-primary" />}
      <AlertDescription>{error ?? success}</AlertDescription>
    </Alert>
  );
}
