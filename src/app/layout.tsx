import "./globals.css";
import { Prompt } from "next/font/google";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className={`${prompt.className} min-h-full bg-bmw-bg text-bmw-text`}>
        {children}
      </body>
    </html>
  );
}
