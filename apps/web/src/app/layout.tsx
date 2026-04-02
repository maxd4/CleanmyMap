import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import { PostHogProvider } from "@/components/posthog-provider";
import { metadata as appMetadata } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = appMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <ClerkProvider>
          <PostHogProvider>
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Navigation compte</p>
                <div className="flex items-center gap-2">
                  <Show when="signed-out">
                    <SignInButton />
                    <SignUpButton />
                  </Show>
                  <Show when="signed-in">
                    <UserButton />
                  </Show>
                </div>
              </div>
            </header>
            {children}
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
