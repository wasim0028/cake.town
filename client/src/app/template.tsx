/**
 * Every page arrives with a short fade and a 12px lift. Pure CSS, so content is visible in the
 * server-rendered HTML (good for SEO and slow phones) and the effect replays on each navigation
 * because Next.js remounts the template.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
