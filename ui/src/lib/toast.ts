import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, { description });
  },

  error: (message: string, description?: string) => {
    return sonnerToast.error(message, { description });
  },

  info: (message: string, description?: string) => {
    return sonnerToast.info(message, { description });
  },

  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, { description });
  },

  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, { description });
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};
