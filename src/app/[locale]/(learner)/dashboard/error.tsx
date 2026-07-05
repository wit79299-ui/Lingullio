'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-navy-900 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-navy-400 mb-4">
          {error.message || 'Erreur inattendue lors du chargement du dashboard.'}
        </p>
        <pre className="text-xs text-left bg-cream-50 border border-cream-200 rounded-lg p-3 mb-4 overflow-auto max-h-40">
          {error.stack || error.message}
        </pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
