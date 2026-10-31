import { Eye, Pencil, Trash2 } from "lucide-react";

interface ProductActionsProps {
  canWrite?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProductActions({
  canWrite = false,
  onView,
  onEdit,
  onDelete,
}: ProductActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="View product"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={onView}
        type="button"
      >
        <Eye aria-hidden="true" size={17} />
      </button>
      {canWrite && <button
        aria-label="Edit product"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={onEdit}
        type="button"
      >
        <Pencil aria-hidden="true" size={17} />
      </button>}
      {canWrite && <button
        aria-label="Delete product"
        className="rounded-md p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-700"
        onClick={onDelete}
        type="button"
      >
        <Trash2 aria-hidden="true" size={17} />
      </button>}
    </div>
  );
}
