"use client";

/* eslint-disable @next/next/no-img-element */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CLASS_LEVELS, formatINR, fromPaise, toPaise, type BakingClass, type Booking, type Image, type Paginated } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { errorsFrom } from "@/lib/hooks";
import { toast } from "@/lib/stores";
import { Drawer } from "./Drawer";
import { ImagePicker } from "./ImagePicker";
import { dateTime, PageTitle, Pager, Pill, Segmented, Table, Toolbar } from "./kit";
import editor from "./Editor.module.css";
import styles from "./Products.module.css";

type AdminClass = BakingClass & { isActive: boolean };
type AdminBooking = Booking & { user?: { name: string; email: string; phone?: string } };

export function Classes() {
  const [tab, setTab] = useState<"classes" | "bookings">("classes");
  return (
    <>
      <PageTitle title="Baking classes" intro="Workshops, their dates and seats, and who has booked." />
      <Toolbar>
        <Segmented label="View" value={tab} onChange={setTab} options={[{ value: "classes", label: "Classes" }, { value: "bookings", label: "Bookings" }]} />
      </Toolbar>
      {tab === "classes" ? <ClassList /> : <Bookings />}
    </>
  );
}

function ClassList() {
  const qc = useQueryClient();
  const classes = useQuery({ queryKey: ["admin", "classes"], queryFn: () => api.get<{ items: AdminClass[] }>("/admin/classes") });
  const [editing, setEditing] = useState<AdminClass | "new" | null>(null);
  const now = Date.now();

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button iconStart={<Plus />} onClick={() => setEditing("new")}>New class</Button>
      </div>
      <Table head={["Class", "Level", <span key="p" className="num">Price</span>, "Next date", <span key="s" className="num">Seats booked</span>, "Status", ""]} loading={classes.isPending} empty="No classes yet.">
        {classes.data?.items.map((c) => {
          const upcoming = c.sessions.filter((s) => new Date(s.startsAt).getTime() > now);
          const next = upcoming[0];
          const booked = upcoming.reduce((n, s) => n + (s.seats - s.seatsLeft), 0);
          const seats = upcoming.reduce((n, s) => n + s.seats, 0);
          return (
            <tr key={c.id}>
              <td>
                <div className={styles.prod}>
                  {c.image ? <img src={c.image.url} alt="" /> : <span className={styles.noImg} />}
                  <div>
                    <strong>{c.title}</strong>
                    <div className="muted small">{c.instructor.name} · {c.durationMinutes} min</div>
                  </div>
                </div>
              </td>
              <td className="small" style={{ textTransform: "capitalize" }}>{c.level}</td>
              <td className="num">{formatINR(c.price)}</td>
              <td className="small">{next ? dateTime.format(new Date(next.startsAt)) : <span className="muted">None scheduled</span>}</td>
              <td className="num">{seats ? `${booked} / ${seats}` : "—"}</td>
              <td>{c.isActive ? <Pill tone="good">Shown</Pill> : <Pill>Hidden</Pill>}</td>
              <td className="num"><button className="text-link small" onClick={() => setEditing(c)}>Edit</button></td>
            </tr>
          );
        })}
      </Table>
      <Drawer open={editing !== null} title={editing === null || editing === "new" ? "New class" : `Edit ${editing.title}`} onClose={() => setEditing(null)}>
        {editing !== null && (
          <ClassForm
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["admin", "classes"] });
            }}
          />
        )}
      </Drawer>
    </>
  );
}

/** ISO → "YYYY-MM-DDTHH:mm" in India time, for <input type="datetime-local">. */
function toIstInput(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

interface SessionDraft {
  key: string;
  startsAt: string;
  seats: string;
  booked: number;
}
let sk = 0;

function ClassForm({ initial, onDone }: { initial: AdminClass | null; onDone: () => void }) {
  const [f, setF] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    instructorName: initial?.instructor.name ?? "",
    instructorBio: initial?.instructor.bio ?? "",
    level: initial?.level ?? "beginner",
    durationMinutes: String(initial?.durationMinutes ?? 120),
    price: initial ? String(fromPaise(initial.price)) : "",
    location: initial?.location ?? "caketown studio",
    learn: initial?.whatYouWillLearn.join("\n") ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [images, setImages] = useState<Image[]>(initial?.image ? [initial.image] : []);
  const [sessions, setSessions] = useState<SessionDraft[]>(
    initial?.sessions.map((s) => ({ key: `s${++sk}`, startsAt: toIstInput(s.startsAt), seats: String(s.seats), booked: s.seats - s.seatsLeft })) ?? [],
  );
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(undefined);
    const body = {
      title: f.title.trim(),
      description: f.description.trim(),
      instructor: { name: f.instructorName.trim(), ...(f.instructorBio.trim() ? { bio: f.instructorBio.trim() } : {}) },
      ...(images[0] ? { image: images[0] } : {}),
      level: f.level,
      durationMinutes: Math.round(Number(f.durationMinutes)),
      price: toPaise(Number(f.price || 0)),
      location: f.location.trim() || "caketown studio",
      whatYouWillLearn: f.learn.split("\n").map((l) => l.trim()).filter(Boolean),
      sessions: sessions.filter((s) => s.startsAt).map((s) => ({ startsAt: `${s.startsAt}:00+05:30`, seats: Math.max(1, Math.round(Number(s.seats) || 1)) })),
      isActive: f.isActive,
    };
    try {
      if (initial) await api.patch(`/admin/classes/${initial.id}`, body);
      else await api.post("/admin/classes", body);
      toast(initial ? "Class saved" : "Class created", { tone: "success" });
      onDone();
    } catch (err) {
      const r = errorsFrom(err);
      setErrors(r.fields);
      setMessage(r.message ?? (Object.keys(r.fields).length ? "Some fields need a look." : undefined));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial || !window.confirm(`Delete “${initial.title}”?`)) return;
    try {
      await api.del(`/admin/classes/${initial.id}`);
      toast("Class deleted");
      onDone();
    } catch (err) {
      setMessage(errorsFrom(err).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Title" error={errors.title}>
        {(p) => <Input {...p} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} autoFocus />}
      </Field>
      <Field label="Description" error={errors.description}>
        {(p) => <Textarea {...p} rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} />}
      </Field>
      <ImagePicker folder="classes" max={1} value={images} onChange={setImages} label="Photo" />
      <div className={editor.row2}>
        <Field label="Instructor" error={errors["instructor.name"]}>
          {(p) => <Input {...p} value={f.instructorName} onChange={(e) => set("instructorName", e.target.value)} maxLength={80} />}
        </Field>
        <Field label="Level">
          {(p) => (
            <Select {...p} value={f.level} onChange={(e) => set("level", e.target.value)}>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l[0]!.toUpperCase() + l.slice(1)}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Price per seat (₹)" error={errors.price}>
          {(p) => <Input {...p} type="number" min={0} value={f.price} onChange={(e) => set("price", e.target.value)} />}
        </Field>
        <Field label="Length (minutes)" error={errors.durationMinutes}>
          {(p) => <Input {...p} type="number" min={15} max={600} step={15} value={f.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />}
        </Field>
      </div>
      <Field label="About the instructor" optional>
        {(p) => <Input {...p} value={f.instructorBio} onChange={(e) => set("instructorBio", e.target.value)} maxLength={400} />}
      </Field>
      <Field label="Where" error={errors.location}>
        {(p) => <Input {...p} value={f.location} onChange={(e) => set("location", e.target.value)} maxLength={200} />}
      </Field>
      <Field label="What you'll learn" optional hint="One point per line.">
        {(p) => <Textarea {...p} rows={4} value={f.learn} onChange={(e) => set("learn", e.target.value)} />}
      </Field>

      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
        <legend style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 8 }}>Dates (India time)</legend>
        {sessions.map((s, i) => (
          <div key={s.key} style={{ display: "grid", gridTemplateColumns: "1fr 90px 36px", gap: 8, alignItems: "center" }}>
            <Input type="datetime-local" aria-label={`Date ${i + 1}`} value={s.startsAt} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, startsAt: e.target.value } : x)))} />
            <Input type="number" min={Math.max(1, s.booked)} aria-label={`Seats for date ${i + 1}`} value={s.seats} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, seats: e.target.value } : x)))} />
            <button
              type="button"
              className={editor.iconBtn}
              disabled={s.booked > 0}
              title={s.booked > 0 ? `${s.booked} seat(s) booked; cancel those bookings first` : undefined}
              onClick={() => setSessions(sessions.filter((_, j) => j !== i))}
              aria-label={`Remove date ${i + 1}`}
            >
              <Trash2 size={16} />
            </button>
            {s.booked > 0 && <span className="small muted" style={{ gridColumn: "1 / -1", marginTop: -4 }}>{s.booked} booked</span>}
          </div>
        ))}
        <div>
          <Button type="button" variant="ghost" size="sm" iconStart={<Plus />} onClick={() => setSessions([...sessions, { key: `s${++sk}`, startsAt: "", seats: "10", booked: 0 }])}>
            Add a date
          </Button>
        </div>
      </fieldset>

      <Switch checked={f.isActive} onChange={(v) => set("isActive", v)} label="Show on the classes page" />
      <FormError>{message}</FormError>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button type="submit" loading={busy} disabled={f.title.trim().length < 3 || f.instructorName.trim().length < 2}>{initial ? "Save" : "Create class"}</Button>
        {initial && <Button type="button" variant="ghost" onClick={remove}>Delete</Button>}
      </div>
    </form>
  );
}

function Bookings() {
  const qc = useQueryClient();
  const classes = useQuery({ queryKey: ["admin", "classes"], queryFn: () => api.get<{ items: AdminClass[] }>("/admin/classes") });
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), limit: "25" });
  if (classId) qs.set("classId", classId);
  const bookings = useQuery({ queryKey: ["admin", "bookings", qs.toString()], queryFn: () => api.get<Paginated<AdminBooking>>(`/admin/bookings?${qs}`) });

  const cancel = async (b: AdminBooking) => {
    if (!window.confirm(`Cancel booking ${b.bookingNumber}? Seats are released and online payments refunded.`)) return;
    try {
      await api.post(`/admin/bookings/${b.id}/cancel`);
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "classes"] });
      toast("Booking cancelled");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't cancel", { tone: "error" });
    }
  };

  return (
    <>
      <Toolbar>
        <Select value={classId} onChange={(e) => (setClassId(e.target.value), setPage(1))} aria-label="Class" style={{ width: "auto" }}>
          <option value="">All classes</option>
          {classes.data?.items.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
      </Toolbar>
      <Table head={["Booking", "Guest", "Class & date", <span key="s" className="num">Seats</span>, "Payment", "Status", ""]} loading={bookings.isPending} empty="No bookings yet.">
        {bookings.data?.items.map((b) => (
          <tr key={b.id}>
            <td>
              <strong>{b.bookingNumber}</strong>
              <div className="muted small">{dateTime.format(new Date(b.createdAt))}</div>
            </td>
            <td className="small">
              {b.user?.name ?? "—"}
              {b.user && <div className="muted">{b.user.phone ?? b.user.email}</div>}
            </td>
            <td className="small">
              {b.class?.title}
              <div className="muted">{dateTime.format(new Date(b.session.startsAt))}</div>
            </td>
            <td className="num">{b.seats}</td>
            <td className="small">
              {formatINR(b.amount)}
              <div className="muted">{b.paymentMethod === "pay_at_venue" ? "At the studio" : "Online"} · {b.paymentStatus}</div>
            </td>
            <td>
              <Pill tone={b.status === "confirmed" ? "good" : b.status === "cancelled" ? "muted" : b.status === "attended" ? "info" : "warn"}>{b.status.replace("_", " ")}</Pill>
            </td>
            <td className="num">
              {(b.status === "confirmed" || b.status === "pending_payment") && (
                <button className="text-link small" onClick={() => cancel(b)}>Cancel</button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {bookings.data && <Pager page={bookings.data.page} totalPages={bookings.data.totalPages} total={bookings.data.total} onPage={setPage} />}
    </>
  );
}
