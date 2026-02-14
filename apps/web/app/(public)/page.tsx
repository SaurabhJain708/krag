"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Cloud,
  Shield,
  Zap,
  Rocket,
  Search,
  Lock,
  FileText,
  Server,
  Brain,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Image
              src="/favicon.ico"
              alt="krag"
              width={70}
              height={70}
              className="rounded-lg"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight">KRAG</span>
              <span className="text-muted-foreground text-xs">
                Silent as a wolf, secure as a fortress
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => router.push("/notebooks")}
              >
                Dashboard
              </Button>
            ) : (
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => router.push("/auth/sign-in")}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 py-20">
        {/* Gradient Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
          <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-linear-to-r from-cyan-500/20 to-blue-500/20 blur-2xl" />
          {/* Decorative favicon in background */}
          <div className="absolute top-20 right-10 opacity-5">
            <Image
              src="/favicon.ico"
              alt=""
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>
          <div className="absolute bottom-20 left-10 opacity-5">
            <Image
              src="/favicon.ico"
              alt=""
              width={150}
              height={150}
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="container mx-auto max-w-4xl text-center">
          {/* Quote */}
          <p className="text-muted-foreground/80 mb-8 text-base italic sm:text-lg">
            &quot;The wolf that lurks in the shadows sees everything, yet
            remains unseen&quot;
          </p>

          <div className="bg-background/50 mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm">
            <Sparkles className="text-primary h-4 w-4" />
            <span className="font-medium">
              World&apos;s First Serverless RAG Agent
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            The World&apos;s First{" "}
            <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Serverless
            </span>{" "}
            One-Click Deployed RAG Agent
          </h1>

          <p className="text-muted-foreground mb-8 text-lg sm:text-xl md:text-2xl">
            <span className="font-semibold">KRAG</span> - Deploy
            production-grade RAG with Modal serverless GPUs. Customize models,
            swap LLMs easily. Your data stays private - only processed on
            serverless GPUs.
          </p>

          {/* Key Points Badges */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <div className="bg-background/80 flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm">
              <Rocket className="text-primary h-4 w-4" />
              <span>One-click deploy</span>
            </div>
            <div className="bg-background/80 flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm">
              <Server className="text-primary h-4 w-4" />
              <span>Serverless GPUs</span>
            </div>
            <div className="bg-background/80 flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm">
              <Shield className="text-primary h-4 w-4" />
              <span>Privacy-first</span>
            </div>
            <div className="bg-background/80 flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm">
              <Zap className="text-primary h-4 w-4" />
              <span>Fully customizable</span>
            </div>
          </div>

          {/* Primary CTA */}
          <Button
            size="lg"
            className="h-12 cursor-pointer px-8 text-lg"
            onClick={() => router.push("/notebooks")}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 border-t py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Image
                src="/favicon.ico"
                alt="krag"
                width={48}
                height={48}
                className="rounded-lg"
              />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything You Need for Production RAG
              </h2>
              <Image
                src="/favicon.ico"
                alt="krag"
                width={48}
                height={48}
                className="rounded-lg"
              />
            </div>
            <p className="text-muted-foreground text-lg">
              Built for scale, security, and simplicity
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Serverless GPU Architecture */}
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Server className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Serverless GPU Architecture</CardTitle>
                <CardDescription>
                  Powered by Modal, zero infrastructure management. Scale
                  automatically with serverless GPUs.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Privacy-First */}
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Shield className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Privacy-First</CardTitle>
                <CardDescription>
                  No data sent to servers except serverless GPUs. Your documents
                  stay private and secure.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Easy LLM Swapping */}
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Zap className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Easy LLM Swapping</CardTitle>
                <CardDescription>
                  Customize and swap models with one click. No code changes
                  needed.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* One-Click Deploy */}
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Rocket className="text-primary h-6 w-6" />
                </div>
                <CardTitle>One-Click Deploy</CardTitle>
                <CardDescription>
                  Deploy production RAG in seconds. Zero configuration required.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Hybrid Retrieval */}
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Search className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Hybrid Retrieval</CardTitle>
                <CardDescription>
                  Vector + Keyword search for the best results. Advanced
                  chunking and reranking.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Multi-Level Encryption */}
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Lock className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Multi-Level Encryption</CardTitle>
                <CardDescription>
                  Advanced security options. Encrypt at rest and in transit with
                  customizable levels.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Multi-Modal Processing */}
            <Card className="transition-all hover:shadow-lg sm:col-span-2 lg:col-span-1">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <FileText className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Multi-Modal Processing</CardTitle>
                <CardDescription>
                  Handle PDFs, images, websites, and more. Advanced parsing with
                  image summarization.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="border-t py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <div className="mb-4 flex items-center justify-center gap-4">
              <Image
                src="/favicon.ico"
                alt=""
                width={40}
                height={40}
                className="rounded-lg opacity-60"
              />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built on Modern Infrastructure
              </h2>
              <Image
                src="/favicon.ico"
                alt=""
                width={40}
                height={40}
                className="rounded-lg opacity-60"
              />
            </div>
            <p className="text-muted-foreground text-lg">
              Production-ready architecture with advanced RAG capabilities
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Cloud className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Modal Serverless GPUs</CardTitle>
                <CardDescription>
                  All processing happens on Modal&apos;s serverless GPU
                  infrastructure. No data leaves the secure GPU environment.
                  Automatic scaling, zero maintenance.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Brain className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Advanced RAG Pipeline</CardTitle>
                <CardDescription>
                  Parent-child chunking, query optimization, hybrid retrieval,
                  and intelligent reranking. Production-grade retrieval with
                  citations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Shield className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Privacy Guaranteed</CardTitle>
                <CardDescription>
                  Your documents are only processed on serverless GPUs. No data
                  sent to external servers. Optional encryption at multiple
                  levels.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Zap className="text-primary h-6 w-6" />
                </div>
                <CardTitle>Fully Customizable</CardTitle>
                <CardDescription>
                  Swap LLM models, adjust chunking strategies, customize
                  retrieval parameters. All configurable without code changes.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-muted/30 border-t py-20">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Deploy Your RAG Agent?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg sm:text-xl">
            One-click deployment. Zero infrastructure. Start building with KRAG
            today.
          </p>
          <Button
            size="lg"
            className="h-12 cursor-pointer px-8 text-lg"
            onClick={() => router.push("/notebooks")}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="text-muted-foreground container mx-auto px-4 text-center text-sm">
          <p>
            © 2026 KRAG. The world&apos;s first serverless one-click deployed
            RAG agent.
          </p>
        </div>
      </footer>
    </div>
  );
}
