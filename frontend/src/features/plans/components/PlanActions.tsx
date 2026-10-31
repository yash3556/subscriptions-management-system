import { Eye, Pencil } from "lucide-react";

interface PlanActionsProps {
  onView: () => void;
  onEdit: () => void;
}

export function PlanActions({ onView, onEdit }: PlanActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="View plan"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={onView}
        type="button"
      >
        <Eye aria-hidden="true" size={17} />
      </button>
      <button
        aria-label="Edit plan"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={onEdit}
        type="button"
      >
        <Pencil aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
