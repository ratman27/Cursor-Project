import "./globals.css";
import ProfileButton from "./components/ProfileButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen font-sans">
        <ProfileButton />
        <div className="min-h-screen flex flex-col items-center justify-start w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
