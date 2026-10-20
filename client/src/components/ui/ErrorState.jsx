// ── Reusable error state component ───────────────────────────
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 bg-apricot-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-apricot-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-mountain-800 mb-2">
        Something went wrong
      </h3>
      <p className="text-mountain-600 text-sm max-w-xs mb-6">
        {message || 'We could not load the content. Please check your connection and try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-apricot-500 hover:bg-apricot-600 text-white rounded-full text-sm font-medium transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
