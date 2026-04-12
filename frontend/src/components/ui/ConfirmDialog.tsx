import React from "react";
import { AnimatedModal } from "@/components/ui/AnimatedModal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onExitComplete?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
  onExitComplete,
}) => {
  const confirmClasses =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30";

  return (
    <AnimatedModal
      open={open}
      zClass="z-[120]"
      className="bg-black/70 backdrop-blur-sm px-4"
      onExitComplete={onExitComplete}
    >
      <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl shadow-black/60 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-8 h-8 rounded-2xl bg-white/5 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base md:text-lg font-semibold text-white">
              {title}
            </h2>
            {description && (
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={loading ? undefined : onCancel}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={loading ? undefined : onConfirm}
            className={`px-5 py-2 rounded-xl text-xs md:text-sm font-semibold shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${confirmClasses}`}
            disabled={loading}
          >
            {loading ? "Kutilmoqda..." : confirmLabel}
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
};
