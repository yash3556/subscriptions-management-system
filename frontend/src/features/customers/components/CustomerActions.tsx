import { Eye, Pencil } from "lucide-react";

interface CustomerActionsProps {
  onView: () => void;
  onEdit: () => void;
}

export function CustomerActions({
  onView,
  onEdit,
}: CustomerActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="View customer"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={onView}
        type="button"
      >
        <Eye aria-hidden="true" size={17} />
      </button>
      <button
        aria-label="Edit customer"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={onEdit}
        type="button"
      >
        <Pencil aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
