import Link from "next/link";
import {
  Building2,
  FileSearch,
  MessageSquare,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 border border-primary/20 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-foreground uppercase">
                IndusMind
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2 font-medium">
                AEC Document Intelligence
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              AI-Powered Document Analysis
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Intelligent Document Q&A for{" "}
            <span className="gradient-text">
              Architecture, Engineering & Construction
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload building codes, specs, RFIs, and submittals. Ask questions in
            natural language and get instant, citation-backed answers powered by
            RAG technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-3 rounded-lg text-sm font-semibold transition-colors border border-border"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-12">
            Built for AEC Professionals
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileSearch className="w-5 h-5" />}
              title="Smart Document Search"
              description="Upload PDFs — building codes, ASTM standards, specifications — and search across all project documents with semantic understanding."
            />
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Conversational Q&A"
              description="Ask questions in plain English. Get precise answers with source citations showing exactly where the information came from."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Project Organization"
              description="Organize documents by project. Cross-reference building codes, submittals, and RFIs within a single project context."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              IndusMind
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            AEC Document Intelligence Platform
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass rounded-xl p-6 glass-hover group">
      <div className="bg-primary/10 border border-primary/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-primary group-hover:bg-primary/15 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
