interface PlaceholderPageProps {
  title: string;
  standalone?: boolean;
}

export function PlaceholderPage({
  title,
  standalone = false,
}: PlaceholderPageProps) {
  return (
    <section
      aria-labelledby="page-title"
      className={
        standalone
          ? "flex min-h-screen items-center justify-center p-6"
          : "mx-auto w-full max-w-7xl"
      }
    >
      <div
        className={
          standalone
            ? "w-full max-w-md rounded-lg border border-slate-200 bg-white p-8"
            : ""
        }
      >
        <h2
          className="text-xl font-semibold text-slate-900"
          id="page-title"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This page is a foundation placeholder. Feature implementation will be
          added after approval.
        </p>
      </div>
    </section>
  );
}
