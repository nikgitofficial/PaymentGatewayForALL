export default function Success() {
  return (
    <main className="min-h-screen grid place-items-center px-5 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight">Payment received</h1>
        <p className="mt-3 text-ink/70">
          Thank you. A receipt is on its way to your email.
        </p>
      </div>
    </main>
  );
}
