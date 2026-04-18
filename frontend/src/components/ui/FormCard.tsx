import React from "react";

interface FormCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const FormCard: React.FC<FormCardProps> = ({
  title,
  description,
  children,
  footer,
}) => {
  return (
    <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 shadow-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
      {footer && <div className="pt-2 border-t border-white/5">{footer}</div>}
    </div>
  );
};


