import React, {
  createContext,
  useContext,
  useCallback,
  useState,
} from "react";
import { View, Dimensions } from "react-native";
import NotificationToast, { ToastType } from "./Toast";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 3000) => {
      const id = `toast-${toastId++}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const handleClose = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          width: Dimensions.get("window").width,
        }}
      >
        {toasts.map((toast, index) => (
          <NotificationToast
            key={toast.id}
            {...toast}
            onClose={handleClose}
            offset={index * 60} // vertical stacking with spacing
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
