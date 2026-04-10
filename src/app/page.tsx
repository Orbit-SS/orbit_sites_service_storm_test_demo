import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, BarChart3, Star } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-base tracking-tight">Orbit</span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">Log in</Button>
            <Button size="sm">Get started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground mb-6">
            <Star className="size-3" />
            Now in public beta
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Hello octav
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Orbit gives your team the tools to build, deploy, and monitor modern web applications — without the operational overhead.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" className="gap-2 px-6 h-11 text-base">
              Start for free <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" size="lg" className="px-6 h-11 text-base">
              View demo
            </Button>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-10 border-y border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center gap-8 items-center text-muted-foreground font-semibold text-sm">
            {["Acme Corp", "Globex", "Initech", "Umbrella Co", "Hooli"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A complete platform built for modern development teams who move fast and need reliability.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Blazing fast deploys",
                description: "Push to production in seconds. Our global edge network delivers your app from 60+ locations worldwide.",
              },
              {
                icon: Shield,
                title: "Enterprise security",
                description: "SOC 2 compliant with end-to-end encryption, SSO, and audit logs built in from day one.",
              },
              {
                icon: BarChart3,
                title: "Real-time analytics",
                description: "Understand your users with instant insights — no third-party trackers, no data sold.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 inline-flex items-center justify-center size-10 rounded-lg bg-muted">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-6 bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xl font-medium leading-relaxed mb-6">
            "Orbit cut our deployment time from 20 minutes to under 30 seconds. Our engineers are happier and our customers notice the difference."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="size-9 rounded-full bg-border" />
            <div className="text-left">
              <p className="text-sm font-medium">Sarah Chen</p>
              <p className="text-xs text-muted-foreground">CTO, Acme Corp</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Ready to launch?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of teams already building on Orbit. No credit card required.
          </p>
          <Button size="lg" className="gap-2 px-8 h-11 text-base">
            Get started free <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Orbit</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <span>© 2026 Orbit, Inc.</span>
        </div>
      </footer>
    </main>
  );
}
