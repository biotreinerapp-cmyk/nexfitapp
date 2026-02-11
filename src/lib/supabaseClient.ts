import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type SupabaseOperation =
  | "select"
  | "insert"
  | "update"
  | "delete"
  | "rpc"
  | "storage-upload"
  | "storage-update";

export function isPermissionOrRlsError(error: any): boolean {
  if (!error) return false;
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  const code = (error as any).code;

  return (
    message.includes("permission denied") ||
    message.includes("violates row-level security policy") ||
    message.includes("new row violates row-level security policy") ||
    message.includes("rls") ||
    code === "42501"
  );
}

export function logPermissionError(
  table: string,
  operation: SupabaseOperation,
  error: any,
): void {
  console.error("[Supabase][Permission/RLS] Falha de permissão ou RLS", {
    table,
    operation,
    code: (error as any)?.code,
    message: (error as any)?.message,
    details: error,
  });
}

