"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function demoSignIn() {
  try {
    await signIn("demo", {
      email: "student@synapse.local",
      redirectTo: "/chat",
    });
  } catch (error) {
    // Successful sign-in throws a redirect — rethrow so Next.js can follow it.
    if (error instanceof AuthError) {
      const reason =
        error.type === "CredentialsSignin" ? "credentials" : "demo";
      redirect(`/login?error=${reason}`);
    }
    throw error;
  }
}

export async function googleSignIn() {
  try {
    await signIn("google", { redirectTo: "/chat" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=google`);
    }
    throw error;
  }
}
