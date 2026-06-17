'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const COLORS: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: 'border-l-[#00ff66]', icon: 'text-[#00ff66]', bg: 'bg-[#00ff66]/5' },
  error: { border: 'border-l-red-500', icon: 'text-red-400', bg: 'bg-red-500/5' },
  warning: { border: 'border-l-[#f1e5ac]', icon: 'text-[#f1e5ac]', bg: 'bg-[#f1e5ac]/5' },
  info: { border: 'border-l-[#4a8aff]', icon: 'text-[#4a8aff]', bg: 'bg-[#4a8aff]/5' },
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
    setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((t) => {
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto animate-slide-in ${c.border} ${c.bg} border border-[#1a2a1a] border-l-4 rounded-xl p-3 shadow-[0_0_30px_rgba(0,0,0,0.6)] flex items-start gap-3 transition-all`}
            >
              <span className={`mt-0.5 shrink-0 ${c.icon}`}>{ICONS[t.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black uppercase text-white">{t.title}</p>
                {t.description && (
                  <p className="text-[11px] text-[#4a5a4a] mt-0.5">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-[#4a5a4a] hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
