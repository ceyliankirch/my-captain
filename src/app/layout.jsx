import { Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
});

export const metadata = {
  title: "My Captain",
  description: "Assistant ultime pour les capitaines d'Interclubs Comité 94",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Captain",
  },
};

export const viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Empêche le zoom automatique sur iOS lors de la saisie
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${montserrat.variable}`}>
      <head>
        {/* Icône pour l'écran d'accueil iOS */}
        <link rel="apple-touch-icon" href="/mycaptain_logo_512.png" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}