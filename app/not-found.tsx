import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold">Nothing here.</h1>
      <p className="mt-2 text-white/60">
        The page or creation you were looking for isn&apos;t on the site.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-black"
      >
        Back to home
      </Link>
    </div>
  );
}
