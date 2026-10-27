import type { Metadata, Viewport } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Shop",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

type Props = { children: React.ReactNode };

export default function InaccessibleEntryRootLayout({ children }: Props) {
  return (
    <html className="inaccessible-app">
      <head>
        <base
          href={
            process.env.NEXT_PUBLIC_BASE_PATH
              ? `${process.env.NEXT_PUBLIC_BASE_PATH}/`
              : "/"
          }
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
