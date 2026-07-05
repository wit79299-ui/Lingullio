'use client';

import { useEffect } from 'react';

export default function LearnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Learner layout error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-25 px-4">
      <div className="text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-navy-900 mb-2">
          Oops, an error occurred
        </h2>
        <p className="text-sm text-navy-400 mb-4">
          {error.message || 'Unexpected error.'}
        </p>
        <pre className="text-xs text-left bg-cream-50 border border-cream-200 rounded-lg p-4 mb-6 overflow-auto max-h-48">
          {error.stack || error.message}
        </pre>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Retry
          </button>
          <a
            href="/login"
            className="px-4 py-2 bg-cream-100 text-navy-700 rounded-lg hover:bg-cream-200 transition-colors"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
