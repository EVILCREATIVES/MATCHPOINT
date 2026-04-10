import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8 py-20">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Train smarter.
              <br />
              <span className="text-primary">Play better.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              MATCHPOINT is a structured, AI-powered tennis training platform built for
              serious players. Personalized plans, expert knowledge, and intelligent coaching —
              all in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" asChild>
              <Link href="/login">Start Training</Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/admin">Admin Access</Link>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-12 border-t max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold">500+</div>
              <div className="text-xs text-muted-foreground mt-1">Drills & Lessons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">AI</div>
              <div className="text-xs text-muted-foreground mt-1">Personalized Plans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">Pro</div>
              <div className="text-xs text-muted-foreground mt-1">Level Training</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-6">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2025 MATCHPOINT. All rights reserved.</span>
          <span>Built for serious tennis players.</span>
        </div>
      </footer>
    </div>
  );
}
