export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-sm text-ink-soft sm:px-6">
        <p className="font-medium text-ink">LexiGuard AI provides informational assistance and does not replace advice from a qualified lawyer.</p>
        <p>AI analysis may be incomplete or inaccurate. Contracts you upload are processed on this server and sent to AWS Bedrock for analysis; they are not used to train models by this app and are kept in memory unless you turn on local persistence.</p>
        <p className="text-ink-faint">Built for a hackathon. Sample data in this app is fictional.</p>
      </div>
    </footer>
  );
}
