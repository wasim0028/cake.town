import { useLocalSearchParams } from "expo-router";
import { CakeSlice, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { Row } from "@/components/Screen";
import { Button, Chip, Empty, H, Skeleton, T } from "@/components/ui";
import { useCategories, useProducts } from "@/lib/queries";
import { fonts, radius, useTheme } from "@/lib/theme";

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "price_asc", label: "Price: low" },
  { id: "price_desc", label: "Price: high" },
  { id: "rating", label: "Best rated" },
] as const;

/** A little cake that spins while the list refreshes. */
function Spinner() {
  const { c } = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
  }, [r]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[{ alignSelf: "center", marginVertical: 8 }, s]}>
      <CakeSlice size={22} color={c.accent} />
    </Animated.View>
  );
}

export default function Shop() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ category?: string; focus?: string }>();
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [eggless, setEggless] = useState(false);
  const [sort, setSort] = useState<string>("popular");
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const cats = useCategories();

  useEffect(() => setCategory(params.category), [params.category]);
  useEffect(() => {
    if (params.focus) setTimeout(() => input.current?.focus(), 300);
  }, [params.focus]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useProducts({ q: debounced, category, dietary: eggless ? ["eggless"] : [], sort });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;
  const colW = (width - 20 * 2 - 16) / 2;

  const header = (
    <View style={{ gap: 14, paddingBottom: 16 }}>
      <H size="xxl">The menu</H>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.lineStrong, paddingHorizontal: 16, height: 50 }}>
        <Search size={18} color={c.muted} />
        <TextInput
          ref={input}
          value={q}
          onChangeText={setQ}
          placeholder="Search cakes, breads, flavours…"
          placeholderTextColor={c.muted}
          returnKeyType="search"
          accessibilityLabel="Search the menu"
          style={{ flex: 1, marginLeft: 10, color: c.text, fontFamily: fonts.body, fontSize: 16 }}
        />
        {q ? (
          <Pressable onPress={() => setQ("")} accessibilityLabel="Clear search" hitSlop={10}>
            <X size={18} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <Chip label="Everything" selected={!category} onPress={() => setCategory(undefined)} />
        {(cats.data ?? []).map((k) => (
          <Chip key={k.slug} label={k.name} selected={category === k.slug} onPress={() => setCategory(category === k.slug ? undefined : k.slug)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <Chip label="Eggless" selected={eggless} onPress={() => setEggless((e) => !e)} />
        <View style={{ width: 1, backgroundColor: c.lineStrong, marginHorizontal: 4 }} />
        {SORTS.map((s) => (
          <Chip key={s.id} label={s.label} selected={sort === s.id} onPress={() => setSort(s.id)} />
        ))}
      </ScrollView>
      <Row style={{ justifyContent: "space-between" }}>
        <T tone="muted" size="sm" accessibilityLiveRegion="polite">
          {query.isPending ? "Looking…" : `${total} ${total === 1 ? "bake" : "bakes"}${debounced ? ` matching “${debounced}”` : ""}`}
        </T>
      </Row>
      {query.isRefetching && !query.isFetchingNextPage ? <Spinner /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={query.isPending ? [] : items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 16 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 120 + insets.bottom, gap: 26 }}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item, index }) => <ProductCard product={item} width={colW} index={index % 12} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void query.refetch()} tintColor={c.accent} colors={[c.accent]} />}
        ListEmptyComponent={
          query.isPending ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ width: colW, gap: 8 }}>
                  <Skeleton width={colW} height={colW} round />
                  <Skeleton width="80%" height={16} />
                  <Skeleton width="40%" height={14} />
                </View>
              ))}
            </View>
          ) : query.isError ? (
            <Empty title="The menu didn't load" body="Check your connection and pull down to try again." />
          ) : (
            <Empty
              art={["Butter Croissant", "pastries"]}
              title="Nothing matches that"
              body="Try another word or remove a filter."
              action={<Button title="Clear filters" variant="secondary" onPress={() => (setQ(""), setCategory(undefined), setEggless(false), setSort("popular"))} />}
            />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={c.accent} style={{ marginTop: 8 }} /> : undefined}
      />
    </View>
  );
}
