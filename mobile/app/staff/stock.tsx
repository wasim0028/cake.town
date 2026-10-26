import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Paginated, Product } from "@caketown/shared";
import { Button, Chip, Empty, Press, Skeleton, Stepper, T } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/stores";
import { fonts, radius, useTheme } from "@/lib/theme";

type Variant = Product["variants"][number] & { stock: number; sku?: string };
type StockProduct = Omit<Product, "variants"> & { isActive: boolean; lowStockThreshold: number; variants: Variant[] };

/** The edit payload for sizes: every field, with ids, so carts keep pointing at the same size. */
const variantsPayload = (vs: Variant[]) =>
  vs.map((v) => ({
    id: v.id,
    label: v.label,
    ...(v.weightGrams ? { weightGrams: v.weightGrams } : {}),
    price: v.price,
    ...(v.compareAtPrice ? { compareAtPrice: v.compareAtPrice } : {}),
    stock: v.stock,
    ...(v.sku ? { sku: v.sku } : {}),
  }));

function ProductRow({ p, onSaved }: { p: StockProduct; onSaved: (p: StockProduct) => void }) {
  const { c } = useTheme();
  const [stock, setStock] = useState(() => Object.fromEntries(p.variants.map((v) => [v.id, v.stock])));
  const [busy, setBusy] = useState(false);
  const dirty = p.variants.some((v) => stock[v.id] !== v.stock);

  const save = async (patch: Record<string, unknown>, message: string) => {
    setBusy(true);
    try {
      const r = await api.patch<{ product: StockProduct }>(`/admin/products/${p.id}`, patch);
      onSaved(r.product);
      haptic.success();
      toast(message, { tone: "success" });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't save", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, gap: 12, opacity: p.isActive ? 1 : 0.75 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {p.images[0] ? <Image source={p.images[0].url} style={{ width: 48, height: 48, borderRadius: radius.sm }} contentFit="cover" /> : <View style={{ width: 48, height: 48, borderRadius: radius.sm, backgroundColor: c.plate }} />}
        <View style={{ flex: 1 }}>
          <T weight="semi" numberOfLines={1}>{p.name}</T>
          <T size="xs" tone="muted">{p.isActive ? "In the shop" : "Hidden from the shop"}</T>
        </View>
        <Switch
          value={p.isActive}
          onValueChange={(v) => void save({ isActive: v }, v ? `${p.name} is back in the shop` : `${p.name} is hidden`)}
          disabled={busy}
          trackColor={{ true: c.fresh, false: c.lineStrong }}
          thumbColor="#fff"
          {...({ activeThumbColor: "#fff" } as object) /* web preview */}
          accessibilityLabel={`Show ${p.name} in the shop`}
        />
      </View>
      {p.variants.map((v) => {
        const n = stock[v.id] ?? 0;
        const low = n <= p.lowStockThreshold;
        return (
          <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T size="sm" weight="semi">{v.label}</T>
              <T size="xs" tone={n === 0 ? "danger" : low ? "accent" : "muted"}>{n === 0 ? "Sold out" : low ? "Running low" : "In stock"}</T>
            </View>
            {/* +10 for a fresh batch out of the oven; the stepper for fine changes. */}
            <Press onPress={() => (haptic.tap(), setStock((s) => ({ ...s, [v.id]: Math.min(999, n + 10) })))} accessibilityRole="button" accessibilityLabel={`Add 10 to ${v.label}`} style={{ paddingHorizontal: 10, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: c.lineStrong, justifyContent: "center" }}>
              <T size="sm" weight="semi">+10</T>
            </Press>
            <Stepper value={n} min={0} max={999} compact onChange={(x) => setStock((s) => ({ ...s, [v.id]: x }))} />
          </View>
        );
      })}
      {dirty && (
        <Button
          title="Save stock"
          size="sm"
          loading={busy}
          onPress={() => void save({ variants: variantsPayload(p.variants.map((v) => ({ ...v, stock: stock[v.id] ?? v.stock }))) }, "Stock updated")}
        />
      )}
    </View>
  );
}

export default function Stock() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<"low" | "" | "hidden">("low");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const key = ["staff", "stock", filter, q];
  const list = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ page: String(pageParam), limit: "20" });
      if (filter) qs.set("status", filter);
      if (q) qs.set("q", q);
      return api.get<Paginated<StockProduct>>(`/admin/products?${qs}`);
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const onSaved = (updated: StockProduct) => {
    qc.setQueryData<{ pages: Paginated<StockProduct>[]; pageParams: unknown[] }>(key, (old) =>
      old && { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)) })) },
    );
    qc.invalidateQueries({ queryKey: ["staff", "stats"] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, paddingHorizontal: 16, height: 46 }}>
          <Search size={18} color={c.muted} />
          <TextInput value={text} onChangeText={setText} placeholder="Find a product" placeholderTextColor={c.muted} style={{ flex: 1, color: c.text, fontFamily: fonts.body, fontSize: 16 }} accessibilityLabel="Find a product" />
        </View>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 8 }}>
          <Chip label="Running low" selected={filter === "low"} onPress={() => setFilter("low")} />
          <Chip label="All" selected={filter === ""} onPress={() => setFilter("")} />
          <Chip label="Hidden" selected={filter === "hidden"} onPress={() => setFilter("hidden")} />
        </View>
      </View>
      {list.isPending ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={140} />
          <Skeleton height={140} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12, paddingBottom: 40 + insets.bottom }}
          renderItem={({ item }) => <ProductRow key={`${item.id}-${item.variants.map((v) => v.stock).join(".")}`} p={item} onSaved={onSaved} />}
          onRefresh={() => void list.refetch()}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={c.accent} /> : undefined}
          ListEmptyComponent={<Empty title={filter === "low" ? "Everything's stocked" : "No products here"} body={filter === "low" ? "Nothing is at or below its low-stock level." : "Try another filter."} />}
        />
      )}
    </View>
  );
}
