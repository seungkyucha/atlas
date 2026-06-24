import { SegmentStatus } from "@/lib/types";

export const STATUS_META: Record<
  SegmentStatus,
  { label: string; cls: string }
> = {
  untranslated: { label: "미번역", cls: "bg-line2 text-muted" },
  ai_draft: { label: "AI 초벌", cls: "bg-indigo-soft text-indigo-deep" },
  translating: { label: "번역중", cls: "bg-indigo-soft text-indigo-deep" },
  translated: { label: "번역완료", cls: "bg-ok-soft text-ok" },
  in_review: { label: "감수중", cls: "bg-warn-soft text-warn" },
  rejected: { label: "반려", cls: "bg-bad-soft text-bad" },
  approved: { label: "승인", cls: "bg-ok-soft text-ok" },
};

export function StatusBadge({ status }: { status: SegmentStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
