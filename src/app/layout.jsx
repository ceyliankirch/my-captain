import "./globals.css";

export const metadata = {
  title: "My Captain",
  description: "Assistant pour les capitaines ICBAD",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}