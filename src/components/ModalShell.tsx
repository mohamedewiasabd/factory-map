import React, { useEffect, useRef } from 'react';
import { useOverlay } from '../hooks/useOverlay';

type ModalShellProps = {
  id: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: 'center' | 'bottom';
  rootClassName?: string;
};

export function ModalShell({
  id,
  open,
  onClose,
  children,
  align = 'center',
  rootClassName = '',
}: ModalShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useOverlay(id, open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusables = () =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((el) => !el.hasAttribute('disabled'));

    const first = focusables()[0];
    if (document.activeElement === document.body && first) {
      try {
        first.focus();
      } catch (e) {
        /* ignore */
      }
    }

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !rootRef.current) return;
      const list = focusables();
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === firstEl || !rootRef.current.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener('keydown', onTab);
    return () => window.removeEventListener('keydown', onTab);
  }, [open]);

  if (!open) return null;

  const alignClasses =
    align === 'bottom'
      ? 'flex items-end sm:items-center justify-center'
      : 'flex items-center justify-center';

  const safeClasses =
    'pt-[max(env(safe-area-inset-top),0rem)] pb-[max(env(safe-area-inset-bottom),0rem)]';

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={id}
      data-overlay-root={id}
      className={`fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md font-['Cairo',sans-serif] ${alignClasses} ${rootClassName}`}
      onClick={() => onCloseRef.current()}
    >
      <div
        className={`w-full flex justify-center ${safeClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}