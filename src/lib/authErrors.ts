export type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_CONFIRMED"
  | "ACCOUNT_INACTIVE"
  | "RATE_LIMIT"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface LoginErrorInfo {
  code: LoginErrorCode;
  message: string;
  /** optional technical detail for logging */
  debug?: unknown;
}

export function mapLoginError(err: unknown): LoginErrorInfo {
  const message = typeof (err as any)?.message === "string" ? String((err as any).message) : "";
  const lower = message.toLowerCase();

  if (message === "ACCOUNT_INACTIVE") {
    return {
      code: "ACCOUNT_INACTIVE",
      message: "Conta inativa. Entre em contato com o suporte.",
      debug: err,
    };
  }

  // Network / fetch errors (browser throws TypeError)
  if ((err as any)?.name === "TypeError" && lower.includes("failed to fetch")) {
    return {
      code: "NETWORK_ERROR",
      message: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
      debug: err,
    };
  }

  // Supabase Auth common messages
  if (lower.includes("invalid login credentials")) {
    return {
      code: "INVALID_CREDENTIALS",
      message: "E-mail ou senha incorretos.",
      debug: err,
    };
  }

  if (lower.includes("email not confirmed") || lower.includes("email confirmation")) {
    return {
      code: "EMAIL_NOT_CONFIRMED",
      message: "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada para continuar.",
      debug: err,
    };
  }

  // Rate limit / abuse protection
  if (lower.includes("rate limit") || lower.includes("too many") || lower.includes("429")) {
    return {
      code: "RATE_LIMIT",
      message: "Muitas tentativas. Aguarde um pouco e tente novamente.",
      debug: err,
    };
  }

  // Fallback: if backend provided a descriptive message, prefer it
  if (message.trim()) {
    return {
      code: "UNKNOWN",
      message,
      debug: err,
    };
  }

  return {
    code: "UNKNOWN",
    message: "Erro interno. Tente novamente em instantes.",
    debug: err,
  };
}
