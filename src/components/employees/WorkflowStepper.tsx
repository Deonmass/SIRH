"use client";

import { Check, Circle } from "lucide-react";
import type { WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WorkflowStepper({
  steps,
  onToggle,
  readonly = false,
}: {
  steps: WorkflowStep[];
  onToggle?: (stepId: string) => void;
  readonly?: boolean;
}) {
  const completed = steps.filter((s) => s.completed).length;
  const progress = steps.length ? (completed / steps.length) * 100 : 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {completed}/{steps.length} étapes complétées
        </span>
        <span className="text-sm font-medium text-sky-400">{Math.round(progress)}%</span>
      </div>
      <div className="mb-6 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            disabled={readonly}
            onClick={() => onToggle?.(step.id)}
            className={cn(
              "w-full flex gap-4 rounded-xl border p-4 text-left transition",
              step.completed
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-white/10 bg-white/[0.02] hover:border-sky-500/30",
              readonly && "cursor-default"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                step.completed
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                  : "border-slate-600 text-slate-500"
              )}
            >
              {step.completed ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium", step.completed ? "text-emerald-300" : "text-white")}>
                {step.label}
              </p>
              <p className="mt-0.5 text-sm text-slate-400">{step.description}</p>
              {step.legalRef && (
                <p className="mt-1 text-xs text-sky-400/80">{step.legalRef}</p>
              )}
            </div>
            {!readonly && (
              <Circle
                className={cn(
                  "h-5 w-5 shrink-0",
                  step.completed ? "text-emerald-500 fill-emerald-500/20" : "text-slate-600"
                )}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
