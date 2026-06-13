"use client";

// Minimal module store — no context needed; Toaster subscribes, toast() pushes.
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

type Variant = "success" | "warning" | "error" | "info";
type ToastItem = {
  id: number;
  message: string;
  variant: Variant;
  actionLabel?: string;
  onAction?: () => void;
};

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(t: Omit<ToastItem, "id">) {
  items = [...items, { ...t, id: nextId++ }];
  emit();
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const ICON: Record<Variant, IconName> = {
  success: "check",
  warning: "warning",
  error: "error",
  info: "info",
};

function ToastRow({ t }: { t: ToastItem }) {
  useEffect(() => {
    const h = setTimeout(() => dismiss(t.id), 5000);
    return () => clearTimeout(h);
  }, [t.id]);
  return (
    <div className="sq-toast">
      <span className={cn("sq-toast-ic", `is-${t.variant}`)}>
        <Icon name={ICON[t.variant]} size={16} fill />
      </span>
      <span className="sq-toast-msg">{t.message}</span>
      {t.actionLabel && (
        <button
          type="button"
          className="sq-toast-action"
          onClick={() => {
            t.onAction?.();
            dismiss(t.id);
          }}
        >
          {t.actionLabel}
        </button>
      )}
    </div>
  );
}

export function Toaster() {
  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => items,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="sq-toast-wrap" role="status" aria-live="polite">
      {snapshot.map((t) => (
        <ToastRow key={t.id} t={t} />
      ))}
    </div>
  );
}
