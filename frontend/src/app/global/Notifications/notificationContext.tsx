import React, { useRef, useContext, createContext } from "react";
import { Toast } from "primereact/toast";

interface ToastContextType {
  showError: (title: string, msg: string, lifetime?: number) => void;
  showWarning: (title: string, msg: string, lifetime?: number) => void;
  showInfo: (title: string, msg: string, lifetime?: number) => void;
}

const customContent = (severity: string, title: string, msg: string) => {
  let attributes: string = "text-white text-lg p-1 rounded-lg items-center justify-center rounded-lg w-full";

  switch (severity) {
    case "info":
      attributes += " bg-blue-500";
      break;
    case "error":
      attributes += " bg-red-500";
      break;
    case "warning":
      attributes += " bg-yellow-500";
      break;
  }

  return (
    <div className={attributes}>
      <div className="font-bold text-lg">{title}</div>
      <div className="text-sm">{msg}</div>
    </div>
  );
};

export const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const toastRef = useRef<Toast>(null);

  /**
   * Shows an error toast reporting what went wrong
   * @param title The title of the error msg
   * @param msg The actual error msg
   * @param lifetime Time the toast should be shown
   */
  const showError = (title: string, msg: string, lifetime: number = 5000) => {
    toastRef?.current?.show({
      severity: "error",
      summary: title,
      detail: msg,
      life: lifetime,
      content: customContent("error", title, msg),
    });
  };

  /**
   * Shows a warning toast reporting what went wrong
   * @param title The title of the warning msg
   * @param msg The actual warning msg
   * @param lifetime Time the toast should be shown
   */
  const showWarning = (title: string, msg: string, lifetime: number = 5000) => {
    toastRef?.current?.show({
      severity: "warn",
      summary: title,
      detail: msg,
      life: lifetime,
      content: customContent("warn", title, msg),
    });
  };

  /**
   * Shows a info toast reporting what went wrong
   * @param title The title of the info msg
   * @param msg The actual info msg
   * @param lifetime Time the toast should be shown
   */
  const showInfo = (title: string, msg: string, lifetime: number = 5000) => {
    toastRef?.current?.show({
      severity: "info",
      summary: title,
      detail: msg,
      life: lifetime,
      content: customContent("info", title, msg),
    });
  };

  return (
    <ToastContext.Provider value={{ showError, showWarning, showInfo }}>
      <Toast ref={toastRef} position="bottom-right"/>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
