interface FormNoticeProps {
  children: string;
}

export function FormNotice({ children }: FormNoticeProps) {
  return (
    <p
      className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900"
      role="status"
    >
      {children}
    </p>
  );
}
