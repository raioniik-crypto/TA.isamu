import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from './providers';

export const metadata: Metadata = {
  title: 'Aimo - AI育成型ブラウジングパートナー',
  description:
    'AIキャラクターと一緒にWebを探検し、共に学び、共に育つプラットフォーム',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  openGraph: {
    title: 'Aimo - AI育成型ブラウジングパートナー',
    description:
      'AIキャラクターと一緒にWebを探検し、共に学び、共に育つプラットフォーム',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary',
    title: 'Aimo',
    description: 'AIキャラクターと一緒にWebを探検しよう',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
