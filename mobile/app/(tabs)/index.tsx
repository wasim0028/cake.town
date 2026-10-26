import { useRouter } from "expo-router";
import { Clock, Search } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { formatINR } from "@caketown/shared";
import { BakeArt, CategoryArt } from "@/art/BakeArt";
import { ProductCard } from "@/components/ProductCard";
import { Row, Screen } from "@/components/Screen";
import { Button, Card, H, Press, Skeleton, T } from "@/components/ui";
import { nextDeliverySlot } from "@/lib/delivery";
import { useBestsellers, useCategories, useClasses } from "@/lib/queries";
import { useAuth } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const BANNERS = [
  { key: "builder", title: "Design your own cake", body: "Shape, sponge, frosting, toppings. Watch it come together.", cta: "Start designing", href: "/builder", art: ["Rasmalai Fusion Cake", "cakes"], dark: true },
  { key: "welcome", title: "10% off your first order", body: "Use WELCOME10 at checkout on orders over ₹499.", cta: "Browse the menu", href: "/(tabs)/shop", art: ["Red Velvet Cupcakes", "cupcakes"], dark: false },
  { key: "classes", title: "Bake it with us", body: "Weekend classes in our kitchen. Take home what you make.", cta: "See classes", href: "/(tabs)/classes", art: ["Butter Croissant", "pastries"], dark: false },
] as const;

export default function Home() {
  const { c } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useAuth((s) => s.user);
  const best = useBestsellers();
  const cats = useCategories();
  const classes = useClasses();
  const [slot, setSlot] = useState(nextDeliverySlot(4));
  const [banner, setBanner] = useState(0);
  const carousel = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const bannerW = width - 40;

  useEffect(() => {
    const t = setInterval(() => setSlot(nextDeliverySlot(4)), 60_000);
    return () => clearInterval(t);
  }, []);
  // Banners advance on their own every 5 seconds.
  useEffect(() => {
    const t = setInterval(() => {
      const next = (banner + 1) % BANNERS.length;
      carousel.current?.scrollTo({ x: next * (bannerW + 12), animated: true });
    }, 5000);
    return () => clearInterval(t);
  }, [banner, bannerW]);

  const refresh = () => Promise.all([best.refetch(), cats.refetch(), classes.refetch()]);
  const nextClass = classes.data?.flatMap((k) => k.sessions.slice(0, 1).map((s) => ({ k, s }))).sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt))[0];

  return (
    <Screen tabs refreshing={best.isRefetching} onRefresh={refresh}>
      <Row style={{ justifyContent: "space-between" }}>
        <View>
          <T tone="muted" size="sm">
            {greeting()}
            {user ? `, ${user.name.split(" ")[0]}` : ""}
          </T>
          <H size="xxl">
            cake<H size="xxl" tone="accent">town</H>
          </H>
        </View>
        <Press onPress={() => router.push({ pathname: "/(tabs)/shop", params: { focus: "1" } })} accessibilityRole="search" accessibilityLabel="Search the menu" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
          <Search size={20} color={c.text} />
        </Press>
      </Row>

      <Animated.View entering={FadeIn.delay(200)}>
        <Row style={{ backgroundColor: c.freshBg, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill }}>
          <Clock size={15} color={c.fresh} />
          <T size="sm" tone="fresh">
            Order a cake now for <T size="sm" tone="fresh" weight="bold">{slot.day}, {slot.label}</T>
          </T>
        </Row>
      </Animated.View>

      {/* banners */}
      <View>
        <ScrollView
          ref={carousel}
          horizontal
          snapToInterval={bannerW + 12}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setBanner(Math.round(e.nativeEvent.contentOffset.x / (bannerW + 12)))}
          contentContainerStyle={{ gap: 12 }}
        >
          {BANNERS.map((b) => (
            <Press key={b.key} onPress={() => router.push(b.href)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`${b.title}. ${b.cta}`} style={{ width: bannerW, height: 170, borderRadius: radius.lg, backgroundColor: b.dark ? c.inverseBg : c.plate, padding: 20, overflow: "hidden" }}>
              <View style={{ width: "62%", gap: 6, zIndex: 1 }}>
                <H size="lg" tone={b.dark ? "inverse" : "default"}>
                  {b.title}
                </H>
                <T size="sm" style={{ color: b.dark ? c.inverseMuted : c.muted }}>
                  {b.body}
                </T>
                <T size="sm" weight="bold" style={{ color: b.dark ? c.accent : c.accentText, marginTop: 4 }}>
                  {b.cta}
                </T>
              </View>
              <View style={{ position: "absolute", right: -16, bottom: -10 }}>
                <BakeArt name={b.art[0]} category={b.art[1]} size={160} />
              </View>
            </Press>
          ))}
        </ScrollView>
        <Row style={{ justifyContent: "center", marginTop: 10, gap: 6 }}>
          {BANNERS.map((b, i) => (
            <View key={b.key} style={{ width: i === banner ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === banner ? c.text : c.lineStrong }} />
          ))}
        </Row>
      </View>

      {/* categories */}
      <View style={{ gap: 12 }}>
        <H size="lg">Browse the counter</H>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }} style={{ marginHorizontal: -20 }}>
          <View style={{ width: 6 }} />
          {(cats.data ?? []).map((k, i) => (
            <Animated.View key={k.slug} entering={FadeInDown.delay(i * 60)}>
              <Press onPress={() => router.push({ pathname: "/(tabs)/shop", params: { category: k.slug } })} accessibilityRole="button" accessibilityLabel={k.name} style={{ alignItems: "center", gap: 6, width: 82 }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.plate, borderWidth: 4, borderColor: c.plateRim, alignItems: "center", justifyContent: "center" }}>
                  <CategoryArt slug={k.slug} size={62} />
                </View>
                <T size="sm" weight="semi">
                  {k.name}
                </T>
              </Press>
            </Animated.View>
          ))}
          {cats.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} width={76} height={76} round />)}
          <View style={{ width: 6 }} />
        </ScrollView>
      </View>

      {/* bestsellers */}
      <View style={{ gap: 12 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <H size="lg">Bestsellers</H>
          <T weight="semi" tone="accent" onPress={() => router.push("/(tabs)/shop")} accessibilityRole="link">
            See all
          </T>
        </Row>
        {best.isPending ? (
          <Row>
            <Skeleton width={160} height={200} />
            <Skeleton width={160} height={200} />
          </Row>
        ) : best.isError ? (
          <Card>
            <T weight="semi">The menu didn&apos;t load</T>
            <T tone="muted" size="sm">
              Pull down to try again.
            </T>
          </Card>
        ) : (
          <FlatList
            horizontal
            data={best.data}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            renderItem={({ item, index }) => <ProductCard product={item} width={156} index={index} />}
          />
        )}
      </View>

      {/* classes */}
      {nextClass && (
        <Press onPress={() => router.push({ pathname: "/class/[slug]", params: { slug: nextClass.k.slug } })} accessibilityRole="button" scaleTo={0.98}>
          <Card style={{ backgroundColor: c.inverseBg, borderColor: c.inverseBg }}>
            <T size="sm" style={{ color: c.accent }} weight="semi">
              Next baking class
            </T>
            <H size="lg" tone="inverse">
              {nextClass.k.title}
            </H>
            <T size="sm" style={{ color: c.inverseMuted }}>
              {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(nextClass.s.startsAt))} · {formatINR(nextClass.k.price)} · {nextClass.s.seatsLeft} seats left
            </T>
          </Card>
        </Press>
      )}

      <Button title="Design your own cake" variant="secondary" size="lg" onPress={() => router.push("/builder")} />
    </Screen>
  );
}
