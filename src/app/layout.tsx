import type { ReactNode } from 'react';
import '@/styles/globals.css';

type Props = {
  children: ReactNode;
};

// Root layout: Next.js 15 requires <html> and <body> here.
// The locale layout wraps children with providers but does NOT
// render its own <html>/<body> to avoid double-wrapping.
export default function RootLayout({ children }: Props) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream-25 text-navy-900 antialiased">
        {children}
      </body>
    </html>
  );
}
