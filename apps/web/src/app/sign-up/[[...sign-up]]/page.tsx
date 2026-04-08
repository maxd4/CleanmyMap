import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <SignUp path="/sign-up" routing="path" fallbackRedirectUrl="/dashboard" signInUrl="/sign-in" />
    </main>
  );
}
