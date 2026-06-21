"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      toast.success("Account created! Signing you in…");

      try {
        await signIn("credentials", {
          email,
          password,
          redirectTo: "/dashboard",
        });
      } catch {
        toast.error("Account created but sign-in failed. Please log in manually.");
      }
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        toast.error("An account with this email already exists.");
        return;
      }
      toast.error(error.message || "Registration failed. Please try again.");
    },
  });

  function validate(): boolean {
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return false;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }

    return true;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    registerMutation.mutate({
      name: name.trim(),
      email,
      password,
    });
  }

  const isLoading = registerMutation.isPending;

  return (
    <Card className="glass glow-amber">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        <CardDescription>
          Join your AEC team and start querying documents
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Jane Cooper"
              autoComplete="name"
              required
              disabled={isLoading}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="engineer@acme.com"
              autoComplete="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              disabled={isLoading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <UserPlus />
            )}
            {isLoading ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
