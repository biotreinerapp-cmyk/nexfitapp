import { toast as baseToast } from "@/hooks/use-toast";

export type FeedbackStatus = "loading" | "success" | "error" | "warning";

export interface FeedbackOptions {
  /** Optional title for the toast. Defaults to the main message. */
  title?: string;
  /** Optional longer description for the toast body. */
  description?: string;
}

export interface FeedbackMessages {
  loading: string;
  success: string;
  /**
   * Optional explicit error message.
   * - string: show this message
   * - undefined: use err.message or generic fallback
   * - false: do NOT show an error toast (caller handles it)
   */
  error?: string | false;
}

export interface FeedbackHandle {
  id: string;
  dismiss: () => void;
  update: (next: { title?: string; description?: string }) => void;
}

const GENERIC_ERROR_FALLBACK = "Something went wrong. Please try again.";

export function useFeedback() {
  /**
   * Show a simple one-off success message.
   * Auto-dismisses after a short period.
   */
  const showSuccess = (message: string, options?: FeedbackOptions) => {
    return baseToast({
      title: options?.title ?? message,
      description: options?.description,
      variant: "default",
    });
  };

  /**
   * Show a non-blocking warning message.
   * Uses the default visual style but with clear copy.
   */
  const showWarning = (message: string, options?: FeedbackOptions) => {
    return baseToast({
      title: options?.title ?? message,
      description: options?.description,
      variant: "default",
    });
  };

  /**
   * Show an error message that stays visible until the user closes it.
   */
  const showError = (message?: string, options?: FeedbackOptions) => {
    return baseToast({
      title: options?.title ?? "Error",
      description: options?.description ?? message ?? GENERIC_ERROR_FALLBACK,
      variant: "destructive",
    });
  };

  /**
   * Show a loading toast and return a handle to update or dismiss it.
   */
  const showLoading = (message: string, options?: FeedbackOptions): FeedbackHandle => {
    const handle = baseToast({
      title: options?.title ?? message,
      description: options?.description,
      variant: "default",
    });

    return {
      id: handle.id,
      dismiss: handle.dismiss,
      update: (next) => {
        handle.update({
          title: next.title ?? handle.id,
          description: next.description,
        } as any);
      },
    };
  };

  /**
   * Helper to wrap any async operation with standardized feedback.
   * - Shows loading immediately
   * - On success: "success" message
   * - On error: Supabase / JS error message or generic fallback
   */
  const withFeedback = async <T>(
    operation: () => Promise<T>,
    messages: FeedbackMessages,
  ): Promise<T> => {
    try {
      const result = await operation();
      showSuccess(messages.success);
      return result;
    } catch (err: any) {
      const explicit = messages.error;
      if (explicit !== false) {
        const fromError = typeof err?.message === "string" ? err.message : undefined;
        showError(typeof explicit === "string" ? explicit : fromError ?? GENERIC_ERROR_FALLBACK);
      }
      throw err;
    }
  };

  return {
    showLoading,
    showSuccess,
    showError,
    showWarning,
    withFeedback,
  };
}
