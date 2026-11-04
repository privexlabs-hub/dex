export function Forbidden({ permission }: { permission: string }) {
  return (
    <main className="text-sm">
      <h1 className="text-lg font-semibold">Not permitted</h1>
      <p className="mt-2 text-muted">
        Your role does not include <code>{permission}</code>. This attempt has been recorded.
      </p>
    </main>
  );
}
