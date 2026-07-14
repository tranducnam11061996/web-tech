export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1.5 text-xs font-medium text-red-300" role="alert">{message}</p>;
}

export function FormErrorSummary({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert" aria-live="assertive">{message}</div>;
}
