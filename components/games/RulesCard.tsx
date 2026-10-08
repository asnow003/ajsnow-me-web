'use client';

import { BookOpen, ChevronDown } from 'lucide-react';

export function RulesCard({ children }: { children: React.ReactNode }) {
  return (
    <details className="group rounded-3xl bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-display text-lg font-medium sm:px-5 [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-5 w-5 text-ink/50" aria-hidden="true" />
        <span className="flex-1">How to play</span>
        <ChevronDown className="h-5 w-5 text-ink/40 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 px-4 pb-5 text-ink/80 sm:px-5">{children}</div>
    </details>
  );
}

export function RulesSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-display text-base font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}
