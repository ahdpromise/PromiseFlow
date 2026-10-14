export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="text-xl font-semibold tracking-tight">
              PromiseFlow
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
              Workflow Management
            </p>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Organize work.
              <br />
              Automate processes.
              <br />
              Move faster.
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              A modern workspace for teams to manage projects,
              tasks, approvals, and workflows in one place.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            © 2026 PromiseFlow
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}