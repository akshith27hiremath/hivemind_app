import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Shield, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="container flex flex-col items-center justify-center gap-8 py-20 md:py-32 text-center">
      <div className="flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
        <Zap className="h-4 w-4 text-yellow-500" />
        <span>Track your investments smarter</span>
      </div>

      <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
        Your Portfolio,{" "}
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Crystal Clear
        </span>
      </h1>

      <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
        HiveMind helps you track, analyze, and optimize your investment portfolio.
        Import from Zerodha, visualize your gains, and make smarter decisions.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" asChild>
          <Link href="/sign-up">
            Start Free <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="#features">See Features</Link>
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span>Bank-level security</span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          <span>Real-time analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span>Zerodha CSV import</span>
        </div>
      </div>
    </section>
  );
}
