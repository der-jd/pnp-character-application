import "@global/styles/globals.css";
import { AuthProvider } from "./global/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
