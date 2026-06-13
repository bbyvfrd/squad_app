"use client";

// Native <dialog>.showModal(): top-layer, focus trap, Esc, inert background — free.
// Canonical .sq-scrim/.sq-sheet render INSIDE the dialog (its own chrome is reset
// by dialog.sqapp-sheet-host in globals.css). Swap internals to Vaul later if
// drag-to-dismiss is ever required — keep these props.
import { useEffect, useRef } from "react";
import { Icon } from "./icon";

export function Sheet({
  open,
  onClose,
  title,
  sub,
  foot,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  foot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sqapp-sheet-host" onClose={onClose} aria-label={title}>
      {open && (
        <div className="sq-scrim" onClick={onClose}>
          <div className="sq-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sq-sheet-grip" />
            <div className="sq-sheet-head">
              <div>
                <div className="sq-sheet-title">{title}</div>
                {sub && <div className="sq-sheet-sub">{sub}</div>}
              </div>
              <button type="button" className="sq-sheet-close" onClick={onClose} aria-label="Close">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="sq-sheet-body">{children}</div>
            {foot && <div className="sq-sheet-foot">{foot}</div>}
          </div>
        </div>
      )}
    </dialog>
  );
}
