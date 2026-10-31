import { Menu } from "lucide-react";

interface NavbarProps {
  pageTitle: string;
  onMenuClick: () => void;
}

export function Navbar({ pageTitle, onMenuClick }: NavbarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        aria-label="Open navigation menu"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        onClick={onMenuClick}
        type="button"
      >
        <Menu aria-hidden="true" size={20} />
      </button>
      <h1 className="text-base font-semibold text-slate-900">{pageTitle}</h1>
    </header>
  );
}