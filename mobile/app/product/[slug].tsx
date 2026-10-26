import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, EggOff, Heart, Star } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Switch, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, FadeInDown, ZoomIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@caketown/shared";
import { ProductCard } from "@/components/ProductCard";
import { Row } from "@/components/Screen";
import { Button, Card, Chip, Empty, Field, H, IconButton, OptionList, Plate, Skeleton, Stepper, T, Tag } from "@/components/ui";
import { api } from "@/lib/api";
import { nextDeliverySlot } from "@/lib/delivery";
import { haptic } from "@/lib/haptics";
import { useProduct, useRelated, useReviews } from "@/lib/queries";
import { toast, useAuth, useCart } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const product = useProduct(slug);
  const related = useRelated(slug);
  const reviews = useReviews(slug);
  const user = useAuth((s) => s.user);
  const add = useCart((s) => s.add);
  const qc = useQueryClient();

  const [variantId, setVariantId] = useState<string>();
  const [flavour, setFlavour] = useState<string>();
  const [eggless, setEggless] = useState(false);
  const [message, setMessage] = useState("");
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);

  // Parallax: the plate drifts up slower than the page and shrinks a little; the top bar fills in.
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const HERO = Math.min(width, 420);
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(y.value, [-200, 0, HERO], [-60, 0, HERO * 0.45], Extrapolation.CLAMP) },
      { scale: interpolate(y.value, [-200, 0, HERO], [1.15, 1, 0.82], Extrapolation.CLAMP) },
    ],
  }));
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO * 0.5, HERO * 0.8], [0, 1], Extrapolation.CLAMP) }));

  const p = product.data;
  if (product.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 60, padding: 20, gap: 16, alignItems: "center" }}>
        <Skeleton width={260} height={260} round />
        <Skeleton width="70%" height={28} />
        <Skeleton width="90%" height={16} />
      </View>
    );
  }
  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40 }}>
        <Empty title="This bake isn't on the menu" body="It may have been removed. Have a look at what's fresh today." action={<Button title="Go to the menu" onPress={() => router.replace("/(tabs)/shop")} />} />
      </View>
    );
  }

  const variant = p.variants.find((v) => v.id === variantId) ?? p.variants.find((v) => v.inStock) ?? p.variants[0]!;
  const chosenFlavour = flavour ?? p.flavours[0];
  const unit = variant.price + (eggless ? p.egglessOption.extraPrice : 0);
  const slot = nextDeliverySlot(p.preparationHours);
  const alreadyEggless = p.dietary.includes("eggless");

  const onAdd = () => {
    if (p.isCustomizable) return router.push("/builder");
    if (!variant.inStock) return;
    haptic.add();
    add(
      {
        productId: p.id,
        variantId: variant.id,
        slug: p.slug,
        name: p.name,
        category: p.category.slug,
        variantLabel: variant.label,
        unitPrice: unit,
        eggless,
        ...(chosenFlavour && p.flavours.length ? { flavour: chosenFlavour } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
        image: p.images[0]?.url,
      },
      qty,
    );
    toast(`Added ${qty > 1 ? `${qty} × ` : ""}${p.name}`, { tone: "success", body: [variant.label, eggless && "eggless"].filter(Boolean).join(" · ") });
  };

  const onSave = async () => {
    if (!user) return router.push("/login");
    haptic.tap();
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.put(`/me/wishlist/${p.id}`);
      else await api.del(`/me/wishlist/${p.id}`);
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    } catch {
      setSaved(!next);
      toast("Couldn't update favourites", { tone: "error" });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ height: HERO + insets.top, alignItems: "center", justifyContent: "flex-end", paddingBottom: 12, backgroundColor: c.plate }}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={heroStyle}>
            <Plate name={p.name} category={p.category.slug} image={p.images[0]?.url} size={HERO * 0.78} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} style={{ padding: 20, gap: 18, marginTop: -20, backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <View style={{ gap: 8 }}>
            <Row style={{ flexWrap: "wrap" }}>
              {p.isBestseller && <Tag label="Bestseller" tone="accent" />}
              {alreadyEggless && <Tag label="Eggless" />}
              {p.dietary.includes("vegan") && <Tag label="Vegan" />}
            </Row>
            <H size="xxl">{p.name}</H>
            {p.rating.count > 0 && (
              <Row style={{ gap: 6 }}>
                <Star size={16} color={c.accent} fill={c.accent} />
                <T weight="semi">{p.rating.average.toFixed(1)}</T>
                <T tone="muted" size="sm">
                  {p.rating.count} review{p.rating.count === 1 ? "" : "s"}
                </T>
              </Row>
            )}
            <T tone="muted">{p.shortDescription ?? p.description}</T>
          </View>

          {p.isCustomizable ? (
            <Card>
              <T>You choose the shape, sponge, frosting and toppings, and watch it come together.</T>
              <Button title="Open the cake designer" onPress={() => router.push("/builder")} />
            </Card>
          ) : (
            <>
              {p.variants.length > 1 && (
                <View style={{ gap: 10 }}>
                  <T weight="semi">{p.category.slug === "cakes" ? "Size" : "Pack"}</T>
                  <OptionList
                    columns={p.variants.length >= 3 ? 3 : 2}
                    value={variant.id}
                    onChange={setVariantId}
                    options={p.variants.map((v) => ({ value: v.id, label: v.label, detail: v.inStock ? formatINR(v.price) : "Sold out", disabled: !v.inStock }))}
                  />
                </View>
              )}
              {p.flavours.length > 0 && (
                <View style={{ gap: 10 }}>
                  <T weight="semi">Flavour</T>
                  <Row style={{ flexWrap: "wrap", gap: 8 }}>
                    {p.flavours.map((f) => (
                      <Chip key={f} label={f} selected={chosenFlavour === f} onPress={() => setFlavour(f)} />
                    ))}
                  </Row>
                </View>
              )}
              {p.egglessOption.available && !alreadyEggless && (
                <Row style={{ justifyContent: "space-between", backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.lineStrong, borderRadius: radius.md, padding: 14 }}>
                  <View style={{ flex: 1 }}>
                    <T weight="semi">Make it eggless</T>
                    <T size="xs" tone="muted">
                      +{formatINR(p.egglessOption.extraPrice)}, baked separately
                    </T>
                  </View>
                  <Switch
                    value={eggless}
                    onValueChange={(v) => (haptic.tap(), setEggless(v))}
                    trackColor={{ true: c.fresh, false: c.lineStrong }}
                    thumbColor="#fff"
                    {...({ activeThumbColor: "#fff" } as object)}
                    accessibilityLabel="Make it eggless"
                  />
                </Row>
              )}
              {p.allowsMessage && (
                <Field
                  label="Message on the cake"
                  optional
                  value={message}
                  onChangeText={setMessage}
                  maxLength={p.maxMessageLength}
                  placeholder="Happy birthday, Ma!"
                  hint={`${message.length}/${p.maxMessageLength} characters, piped in chocolate`}
                />
              )}
              <Row style={{ justifyContent: "space-between" }}>
                <T weight="semi">Quantity</T>
                <Stepper value={qty} onChange={setQty} />
              </Row>
            </>
          )}

          <Card>
            <Row>
              <Clock size={18} color={c.accentText} />
              <T size="sm" style={{ flex: 1 }}>
                Earliest delivery <T size="sm" weight="bold">{slot.day}, {slot.label}</T>
              </T>
            </Row>
            {(alreadyEggless || p.egglessOption.available) && (
              <Row>
                <EggOff size={18} color={c.accentText} />
                <T size="sm">{alreadyEggless ? "Made without eggs" : "Eggless version available"}</T>
              </Row>
            )}
          </Card>

          {p.description && p.shortDescription ? (
            <View style={{ gap: 6 }}>
              <H size="lg">About this bake</H>
              <T tone="muted">{p.description}</T>
            </View>
          ) : null}

          {(reviews.data?.items.length ?? 0) > 0 && (
            <View style={{ gap: 10 }}>
              <H size="lg">Reviews</H>
              {reviews.data!.items.slice(0, 3).map((r) => (
                <Card key={r.id}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <T weight="semi">{r.user.name}</T>
                    <Row style={{ gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={13} color={i <= r.rating ? c.accent : c.lineStrong} fill={i <= r.rating ? c.accent : "transparent"} />
                      ))}
                    </Row>
                  </Row>
                  {r.comment ? <T tone="muted">{r.comment}</T> : null}
                </Card>
              ))}
            </View>
          )}

          {(related.data?.length ?? 0) > 0 && (
            <View style={{ gap: 12 }}>
              <H size="lg">You may also like</H>
              <FlatList
                horizontal
                data={related.data}
                keyExtractor={(x) => x.id}
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20 }}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
                renderItem={({ item }) => <ProductCard product={item} width={140} />}
              />
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>

      {/* top bar: transparent over the photo, solid once you scroll */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.line }, barStyle]} />
        <Row style={{ justifyContent: "space-between", zIndex: 1 }}>
          <IconButton label="Back" filled onPress={() => router.back()}>
            <ArrowLeft size={20} color={c.text} />
          </IconButton>
          <Animated.Text numberOfLines={1} style={[{ flex: 1, textAlign: "center", fontFamily: "Fraunces_600SemiBold", fontSize: 17, color: c.text }, barStyle]}>
            {p.name}
          </Animated.Text>
          <IconButton label={saved ? "Remove from favourites" : "Save to favourites"} filled onPress={onSave}>
            <Heart size={20} color={saved ? c.danger : c.text} fill={saved ? c.danger : "transparent"} />
          </IconButton>
        </Row>
      </View>

      {/* sticky buy bar */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View>
          <T size="xs" tone="muted">
            {p.isCustomizable ? "From" : "Total"}
          </T>
          <T size="xl" weight="bold">
            {formatINR(p.isCustomizable ? p.priceFrom : unit * qty)}
          </T>
        </View>
        <Button
          title={p.isCustomizable ? "Design it" : variant.inStock ? "Add to cart" : "Sold out"}
          size="lg"
          disabled={!p.isCustomizable && !variant.inStock}
          onPress={onAdd}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
