import Link from "next/link";

const adminNav = [
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/ingest", label: "Ingest" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-6">
          <span className="text-sm uppercase tracking-widest text-accent">Admin</span>
          <nav className="flex gap-4 text-sm">
            {adminNav.map((item) => (
              <Link key={item.href} href={item.href} className="text-white/70 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action="/admin/logout" method="post">
          <button type="submit" className="text-sm text-white/50 hover:text-white">
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
