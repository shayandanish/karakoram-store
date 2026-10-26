export default function PageLoading() {
  return (
    <div
      className="flex min-h-[40vh] w-full items-center justify-center px-4 py-16"
      role="status"
      aria-label="Loading page"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-apricot-500 border-t-transparent" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
