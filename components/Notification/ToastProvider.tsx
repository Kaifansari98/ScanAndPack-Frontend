import React, { createContext, useContext, useState, ReactNode } from "react";
import NotificationToast from "./Toast";


type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<{
    type: ToastType;
    message: string;
  } | null>(null);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000); // 3 sec ke baad hide
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <NotificationToast type={toast.type} message={toast.message} />}
    </ToastContext.Provider>
  );
};
