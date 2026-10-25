import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingPanel } from "@/components/classes/Classes";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClass } from "@/lib/server-api";
import styles from "../classes.module.css";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getClass(slug);
  if (!c) return { title: "Not found" };
  return { title: c.title, description: c.description.slice(0, 155), alternates: { canonical: `/classes/${c.slug}` } };
}

export default async function ClassPage({ params }: Props) {
  const { slug } = await params;
  const c = await getClass(slug);
  if (!c) notFound();
  const hours = Math.round((c.durationMinutes / 60) * 10) / 10;
  return (
    <>
      <PageHeader title={c.title} crumbs={[{ href: "/classes", label: "Baking classes" }, { href: `/classes/${c.slug}`, label: c.title }]} compact>
        <p className={styles.facts} style={{ marginTop: "1rem" }}>
          <span>
            <strong>{hours} hours</strong>
          </span>
          <span style={{ textTransform: "capitalize" }}>
            <strong>{c.level}</strong> level
          </span>
          <span>{c.location}</span>
        </p>
      </PageHeader>
      <div className={`container ${styles.detail}`}>
        <div className={styles.body}>
          <p className="lede" style={{ maxWidth: "56ch" }}>
            {c.description}
          </p>
          {c.whatYouWillLearn.length > 0 && (
            <>
              <h2>What you&rsquo;ll learn</h2>
              <ul className={styles.learn}>
                {c.whatYouWillLearn.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
          <h2>Your teacher</h2>
          <div className={styles.teacher}>
            <span className={styles.teacherAvatar} aria-hidden>
              {c.instructor.name.charAt(0)}
            </span>
            <div>
              <strong>{c.instructor.name}</strong>
              {c.instructor.bio && <p className="muted">{c.instructor.bio}</p>}
            </div>
          </div>
          <h2>Good to know</h2>
          <p className="muted">
            Arrive 10 minutes early. Wear closed shoes and tie back long hair; we provide aprons. Tell us about allergies when you book and we&rsquo;ll adapt the recipe.
          </p>
        </div>
        <BookingPanel cls={c} />
      </div>
    </>
  );
}
