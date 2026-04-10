"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo size="lg" className="justify-center" />
          <p className="text-sm text-muted-foreground mt-3">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input placeholder="Your name" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input placeholder="your@email.com" type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input placeholder="••••••••" type="password" />
            </div>
            <Button className="w-full" asChild>
              <Link href={isSignUp ? "/onboarding" : "/dashboard"}>
                {isSignUp ? "Create Account" : "Sign In"}
              </Link>
            </Button>

            <Separator />

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </CardContent>
        </Card>

        {/* Quick access for demo */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">Quick Access (Demo)</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">User Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">Admin Panel</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
