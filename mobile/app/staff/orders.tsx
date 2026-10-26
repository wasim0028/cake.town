import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OrderStatus, Paginated } from "@caketown/shared";
import { OrderCard, type StaffOrder } from "@/components/staff";
import { Chip, Empty, Skeleton, T } from "@/components/ui";
import { api } from "@/lib/api";
import { fonts, radius, useTheme } from "@/lib/theme";

const TABS: { value: "" | OrderStatus; label: string }[] = [
  { value: "placed", label: "New" },
  { value: "baking", label: "Baking" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "", label: "All" },
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "cancelled", label: "Cancelled" },
];

export default function StaffOrders() {
  const params = useLocalSearchParams<{ status?: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"" | OrderStatus>((params.status as OrderStatus) ?? "placed");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const orders = useInfiniteQuery({
    queryKey: ["staff", "orders", "list", status, q],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ page: String(pageParam), limit: "20" });
      if (status) qs.set("status", status);
      if (q) qs.set("q", q);
      return api.get<Paginated<StaffOrder>>(`/admin/orders?${qs}`);
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    refetchInterval: 30_000,
  });
  const items = orders.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, paddingHorizontal: 16, height: 46 }}>
          <Search size={18} color={c.muted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Order number, name or phone"
            placeholderTextColor={c.muted}
            style={{ flex: 1, color: c.text, fontFamily: fonts.body, fontSize: 16 }}
            accessibilityLabel="Search orders"
            returnKeyType="search"
            autoCapitalize="characters"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
          {TABS.map((t) => (
            <Chip key={t.value || "all"} label={t.label} selected={status === t.value} onPress={() => setStatus(t.value)} />
          ))}
        </ScrollView>
      </View>
      {orders.isPending ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={110} />
          <Skeleton height={110} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12, paddingBottom: 40 + insets.bottom }}
          renderItem={({ item }) => <OrderCard o={item} onPress={() => router.push({ pathname: "/staff/order/[id]", params: { id: item.id } })} />}
          onRefresh={() => void orders.refetch()}
          refreshing={orders.isRefetching && !orders.isFetchingNextPage}
          onEndReached={() => orders.hasNextPage && !orders.isFetchingNextPage && void orders.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={orders.isFetchingNextPage ? <ActivityIndicator color={c.accent} /> : items.length ? <T size="xs" tone="muted" style={{ textAlign: "center" }}>{orders.data?.pages[0]?.total} order(s)</T> : undefined}
          ListEmptyComponent={<Empty title={status === "placed" ? "Nothing waiting" : "No orders here"} body={status === "placed" ? "New orders show up here, and on your phone as a notification." : "Try another filter or search."} />}
        />
      )}
    </View>
  );
}
