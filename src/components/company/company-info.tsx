export function CompanyInfoCard() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">SplitNinja HQ</h2>
      <p className="mt-2 text-sm text-zinc-600">
        We build SplitNinja to make group finances painless. Reach out anytime—your ideas shape what
        comes next.
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <dt className="w-20 text-zinc-500">Email</dt>
          <dd>
            <a
              href="mailto:splitninja2025@gmail.com"
              className="text-emerald-600 hover:underline"
            >
              splitninja2025@gmail.com
            </a>
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="w-20 text-zinc-500">Support</dt>
          <dd>
            <a
              href="https://github.com/francisyang/splitninja/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline"
            >
              GitHub Issues
            </a>
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-zinc-500">
        SplitNinja · Remote-first · Privacy-first expense sharing.
      </p>
    </section>
  );
}
