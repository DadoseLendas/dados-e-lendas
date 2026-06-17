'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message = 'Esta ação não pode ser desfeita.',
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
      <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-80 flex flex-col gap-5">
        <h3 className="text-white text-base font-black uppercase text-center tracking-widest">
          {title}
        </h3>
        <p className="text-[#4a5a4a] text-[14px] text-center uppercase">
          {message}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-[#1a2a1a] text-[#4a5a4a] text-[14px] font-black uppercase py-2 rounded-lg hover:border-[#00ff66]/40 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white text-[14px] font-black uppercase py-2 rounded-lg hover:brightness-110 transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
