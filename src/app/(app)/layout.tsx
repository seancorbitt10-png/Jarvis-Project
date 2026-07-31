import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

const links = [
  { href: "/chat", label: "Chat" },
  { href: "/connections", label: "Connections" },
  { href: "/plugins", label: "Plugins" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6">
      <header className="panel mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/chat" className="display text-xl font-semibold">
            Synapse
          </Link>
          <nav className="flex flex-wrap gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-[var(--ink-soft)] sm:block">
            {session.user.name ?? session.user.email}
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn btn-ghost px-3 py-2 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
