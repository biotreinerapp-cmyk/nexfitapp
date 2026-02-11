type SupabaseLikeError = {
  code?: string;
  message?: string;
  status?: number;
};

export function isSchemaCacheError(error: unknown): boolean {
  const e = error as SupabaseLikeError | null | undefined;
  const msg = typeof e?.message === "string" ? e.message : "";
  return e?.code === "PGRST002" || msg.includes("schema cache");
}

export function getFriendlySupabaseErrorMessage(error: unknown): string {
  const e = error as SupabaseLikeError | null | undefined;

  if (isSchemaCacheError(error)) {
    return "Servidor temporariamente indisponível. Estamos tentando reconectar — tente novamente em instantes.";
  }

  if (typeof e?.message === "string" && e.message.trim()) return e.message;

  return "Erro interno. Tente novamente em instantes.";
}

export async function withSchemaCacheRetry<T>(
  operation: () => PromiseLike<T>,
  opts: { retries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 600;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await Promise.resolve(operation());
    } catch (err) {
      lastErr = err;

      // Only retry known transient schema-cache errors
      const supaErr = (err as any)?.error ?? err;
      if (!isSchemaCacheError(supaErr) || attempt === retries) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn("[supabase/retry] schema cache", { label: opts.label, attempt, delay, err });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastErr;
}
