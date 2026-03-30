import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Palmeiras/Minas Sports Portal',
  description: 'Portal de esportes focado no Palmeiras e times mineiros.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
