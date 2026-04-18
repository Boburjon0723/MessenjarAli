import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getExpertActionType, getExpertPanelMode } from '@/lib/expert-roles';
import { getExpertComplianceNotice } from '@/lib/expert-compliance-copy';
import { getClientServiceTerms } from '@/lib/client-service-terms';

interface ExpertActionsPanelProps {
  expert: any;
  onClose?: () => void;
}

export default function ExpertActionsPanel({ expert, onClose }: ExpertActionsPanelProps) {
  const { t, tLines } = useLanguage();
  if (!expert) return null;

  const actionType = getExpertActionType(expert);
  const panelMode = getExpertPanelMode(expert);
  const clientCompliance = getExpertComplianceNotice(panelMode, 'client', t, tLines);
  const serviceTerms = getClientServiceTerms(actionType, t, tLines);

  return (
    <div className="fixed lg:relative inset-0 lg:inset-auto z-[70] lg:z-0 h-full min-h-0 w-full flex flex-col max-lg:bg-white/[0.07] max-lg:backdrop-blur-2xl max-lg:backdrop-saturate-150 lg:bg-transparent lg:backdrop-blur-none border-l-0 lg:border-l lg:border-white/20 overflow-hidden animate-slide-left select-none relative pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
      <button
        onClick={onClose}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all lg:top-4"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-4">
        {clientCompliance && (
          <div className="mx-4 mb-3 rounded-xl border border-amber-400/35 bg-amber-500/[0.11] px-3 py-2.5 text-[11px] text-amber-50/95 leading-snug">
            <p className="font-bold text-amber-100 mb-1">{clientCompliance.title}</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-50/90">
              {clientCompliance.lines.map((ln, i) => (
                <li key={i}>{ln}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mx-4 mb-4 space-y-3">
          <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/[0.08] px-3 py-3 text-[11px] text-white/85 leading-snug">
            <h4 className="text-cyan-200 font-bold text-[10px] uppercase tracking-wider mb-2">
              {serviceTerms.paymentTitle}
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-white/75">
              {serviceTerms.paymentLines.map((ln, i) => (
                <li key={i}>{ln}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-blue-400/25 bg-blue-500/[0.08] px-3 py-3 text-[11px] text-white/85 leading-snug">
            <h4 className="text-blue-200 font-bold text-[10px] uppercase tracking-wider mb-2">
              {serviceTerms.consultTitle}
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-white/75">
              {serviceTerms.consultLines.map((ln, i) => (
                <li key={i}>{ln}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

