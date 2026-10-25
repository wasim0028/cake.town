import type { ReactNode } from "react";

/** Renders simple paragraph data: "## " → heading, consecutive "- " lines → a list. */
export function Prose({ blocks }: { blocks: string[] }) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={`l${out.length}`}>{list.map((l) => <li key={l}>{l}</li>)}</ul>);
    list = [];
  };
  for (const b of blocks) {
    if (b.startsWith("- ")) {
      list.push(b.slice(2));
      continue;
    }
    flush();
    out.push(b.startsWith("## ") ? <h2 key={out.length}>{b.slice(3)}</h2> : <p key={out.length}>{b}</p>);
  }
  flush();
  return <div className="prose">{out}</div>;
}
