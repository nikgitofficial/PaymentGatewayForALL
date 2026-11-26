import Link from "next/link";

export default function Cancelled() {
  return (
    <main className="min-h-screen grid place-items-center px-5 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight">Payment not completed</h1>
        <p className="mt-3 text-ink/70">You haven’t been charged. You can try again any time.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-moss px-5 py-3 font-semibold text-white hover:bg-moss-dark">
          Try again
        </Link>
      </div>
    </main>
  );
}
