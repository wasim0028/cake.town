import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Linking, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusPill, timeLabel } from "@/components/staff";
import { Button, Chip, Empty, Skeleton, T } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { radius, useTheme } from "@/lib/theme";

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
interface Page {
  items: Message[];
  page: number;
  totalPages: number;
  total: number;
  open: number;
}

export default function Messages() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState<"false" | "true">("false");
  const key = ["staff", "messages", "list", show];
  const list = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<Page>(`/admin/messages?handled=${show}&page=${pageParam}&limit=20`),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const open = list.data?.pages[0]?.open;

  const toggle = async (m: Message) => {
    await api.patch(`/admin/messages/${m.id}`, { handled: !m.handled });
    haptic.tap();
    qc.setQueryData<{ pages: Page[]; pageParams: unknown[] }>(key, (old) => old && { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.filter((x) => x.id !== m.id) })) });
    qc.invalidateQueries({ queryKey: ["staff", "messages"] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
        <Chip label={open ? `To handle · ${open}` : "To handle"} selected={show === "false"} onPress={() => setShow("false")} />
        <Chip label="Handled" selected={show === "true"} onPress={() => setShow("true")} />
      </View>
      {list.isPending ? (
        <View style={{ padding: 20 }}><Skeleton height={140} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12, paddingBottom: 40 + insets.bottom }}
          onRefresh={() => void list.refetch()}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onEndReached={() => list.hasNextPage && void list.fetchNextPage()}
          ListEmptyComponent={<Empty title={show === "false" ? "All caught up" : "Nothing yet"} body={show === "false" ? "Messages from the contact form land here, with a notification." : "Handled messages appear here."} />}
          renderItem={({ item: m }) => (
            <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, borderLeftWidth: m.handled ? 1 : 4, borderLeftColor: m.handled ? c.line : c.accent, padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <T weight="bold" style={{ flex: 1 }}>{m.subject || "Message"}</T>
                {m.handled ? <StatusPill status="delivered" label="Handled" /> : null}
              </View>
              <T>{m.message}</T>
              <T size="xs" tone="muted">{m.name} · {timeLabel.format(new Date(m.createdAt))}</T>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Button title="Email" size="sm" variant="secondary" icon={<Mail size={16} color={c.text} />} onPress={() => void Linking.openURL(`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message to caketown"}`)}`)} />
                {m.phone ? <Button title="Call" size="sm" variant="secondary" icon={<Phone size={16} color={c.text} />} onPress={() => void Linking.openURL(`tel:+91${m.phone}`)} /> : null}
                <Button title={m.handled ? "Move back" : "Mark handled"} size="sm" variant={m.handled ? "ghost" : "primary"} onPress={() => void toggle(m)} />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
