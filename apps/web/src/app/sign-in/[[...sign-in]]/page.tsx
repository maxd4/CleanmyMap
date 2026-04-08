import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <SignIn path="/sign-in" routing="path" fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </main>
  );
}
