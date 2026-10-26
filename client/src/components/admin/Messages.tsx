"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { dateTime, PageTitle, Pager, Pill, Segmented, Toolbar } from "./kit";
import styles from "./Inbox.module.css";

interface Message {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  handled: boolean;
  createdAt: string;
}
interface MessagePage {
  items: Message[];
  page: number;
  totalPages: number;
  total: number;
  open: number;
}

export function Messages() {
  const qc = useQueryClient();
  const [show, setShow] = useState<"false" | "true" | "">("false");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), limit: "20" });
  if (show) qs.set("handled", show);
  const key = ["admin", "messages", qs.toString()];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<MessagePage>(`/admin/messages?${qs}`) });

  const mark = async (m: Message) => {
    await api.patch(`/admin/messages/${m.id}`, { handled: !m.handled });
    qc.setQueryData<MessagePage>(key, (old) => old && { ...old, open: old.open + (m.handled ? 1 : -1), items: old.items.map((x) => (x.id === m.id ? { ...x, handled: !m.handled } : x)) });
    qc.invalidateQueries({ queryKey: ["admin", "messages"], refetchType: "none" });
    qc.invalidateQueries({ queryKey: ["admin", "messages", "count"] });
  };

  return (
    <>
      <PageTitle title="Messages" intro="From the contact form. Reply by email or phone, then mark it handled." />
      <Toolbar>
        <Segmented
          label="Show"
          value={show}
          onChange={(v) => (setShow(v), setPage(1))}
          options={[
            { value: "false", label: "To handle", count: q.data?.open },
            { value: "true", label: "Handled" },
            { value: "", label: "All" },
          ]}
        />
      </Toolbar>
      {q.isPending ? (
        <div className={styles.skeleton} />
      ) : !q.data?.items.length ? (
        <p className={styles.empty}>{show === "false" ? "All caught up. 🎉" : "No messages."}</p>
      ) : (
        <ul role="list" className={styles.list}>
          {q.data.items.map((m) => (
            <li key={m.id} className={styles.item} data-unread={!m.handled || undefined} data-dim={m.handled || undefined}>
              <div className={styles.meta}>
                <strong>{m.subject || "Message"}</strong>
                {m.handled && <Pill tone="good">Handled</Pill>}
                <span className="small muted">{dateTime.format(new Date(m.createdAt))}</span>
              </div>
              <p className={styles.body}>{m.message}</p>
              <div className={styles.foot}>
                <span className="small">
                  {m.name} ·{" "}
                  <a className="text-link" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message to caketown"}`)}`}>
                    <Mail size={13} aria-hidden /> {m.email}
                  </a>
                  {m.phone && (
                    <>
                      {" · "}
                      <a className="text-link" href={`tel:+91${m.phone}`}>
                        <Phone size={13} aria-hidden /> {m.phone}
                      </a>
                    </>
                  )}
                </span>
                <button className="text-link small" onClick={() => mark(m)}>{m.handled ? "Mark as to handle" : "Mark handled"}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {q.data && <Pager page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} onPage={setPage} />}
    </>
  );
}
