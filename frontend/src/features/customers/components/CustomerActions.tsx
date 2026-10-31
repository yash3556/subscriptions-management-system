import { Eye, Pencil, Trash2 } from "lucide-react";

interface CustomerActionsProps {
  canWrite?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerActions({
  canWrite = false,
  onView,
  onEdit,
  onDelete,
}: CustomerActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {canWrite && <button
        aria-label="View customer"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={onView}
        type="button"
      >
        <Eye aria-hidden="true" size={17} />
      </button>
      }
      {canWrite && <button
        aria-label="Delete customer"
        className="rounded-md p-2 text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
        onClick={onDelete}
        type="button"
      >
        <Trash2 aria-hidden="true" size={17} />
      </button>}
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
