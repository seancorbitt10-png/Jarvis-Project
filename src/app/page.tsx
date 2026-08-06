import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/safe-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getOptionalSession();
  if (session?.user) redirect("/chat");

  return (
    <main className="relative overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-8">
        <header className="flex items-center justify-between animate-rise">
          <div className="display text-2xl font-semibold tracking-tight">Synapse</div>
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
        </header>

        <section className="mt-16 grid flex-1 items-center gap-12 lg:mt-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-rise">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">
              Student operating system
            </p>
            <h1 className="display text-5xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-6xl lg:text-7xl">
              Synapse
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--ink-soft)] sm:text-xl">
              Jarvis connects your school apps and plugins, then answers in one
              place — schedule, classroom work, mail, and notes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary">
                Enter Synapse
              </Link>
              <a href="#how" className="btn btn-ghost">
                How it works
              </a>
            </div>
          </div>

          <div className="panel hero-mesh relative min-h-[340px] overflow-hidden p-6 animate-rise-delay lg:min-h-[420px]">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]">
                <span className="live-dot" />
                Jarvis online
              </div>
              <div className="panel max-w-md bg-white/80 p-4">
                <p className="text-sm text-[var(--ink-soft)]">You</p>
                <p className="mt-1 font-medium">What&apos;s tomorrow look like?</p>
                <p className="mt-4 text-sm text-[var(--ink-soft)]">Jarvis</p>
                <p className="mt-1 text-[0.95rem] leading-relaxed">
                  9:00 AP Chem · Classroom lab due tonight · RenWeb pep rally at
                  2:30 · Notes: limiting reagents review ready.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mt-20 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Connect",
              body: "Google Calendar, Gmail, Classroom, RenWeb/FACTS, and plugin apps — permissioned and read-only in v1.",
            },
            {
              title: "Orchestrate",
              body: "Jarvis is one agent with tools. Ask once; it pulls across every granted source.",
            },
            {
              title: "Remember",
              body: "Preferences and context stay on the server so Synapse follows you across devices.",
            },
          ].map((item) => (
            <div key={item.title} className="panel p-6">
              <h2 className="display text-2xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-[var(--ink-soft)]">{item.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
