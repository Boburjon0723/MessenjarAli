'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

type DialogPayload = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<DialogPayload | null>(null);
  const [visible, setVisible] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPayload({ ...options, resolve });
      setVisible(true);
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setPayload((p) => {
      if (p) p.resolve(value);
      return p;
    });
    setVisible(false);
  }, []);

  const handleExitComplete = useCallback(() => {
    setPayload(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {payload && (
        <ConfirmDialog
          open={visible}
          title={payload.title}
          description={payload.description}
          confirmLabel={payload.confirmLabel}
          cancelLabel={payload.cancelLabel}
          variant={payload.variant}
          onConfirm={() => finish(true)}
          onCancel={() => finish(false)}
          onExitComplete={handleExitComplete}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
}

