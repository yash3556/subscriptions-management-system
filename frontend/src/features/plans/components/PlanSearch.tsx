import { Search } from "lucide-react";

interface PlanSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PlanSearch({ value, onChange }: PlanSearchProps) {
  return (
    <label className="relative block w-full sm:max-w-sm">
      <span className="sr-only">Search plans by name</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        size={18}
      />
      <input
        className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search plans by name"
        type="search"
        value={value}
      />
    </label>
  );
}
