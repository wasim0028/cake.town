import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatINR, type Product } from "@caketown/shared";
import { haptic } from "@/lib/haptics";
import { toast, useCart } from "@/lib/stores";
import { useTheme } from "@/lib/theme";
import { Plate, Press, Price, T, Tag } from "./ui";

/** A product on its plate. "+" adds the first size in stock; tapping opens the product. */
export function ProductCard({ product, width, index = 0 }: { product: Product; width: number; index?: number }) {
  const router = useRouter();
  const { c } = useTheme();
  const add = useCart((s) => s.add);
  const variant = product.variants.find((v) => v.inStock);

  const onAdd = () => {
    if (product.isCustomizable) return router.push("/builder");
    if (!variant) return;
    haptic.add();
    add({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      category: product.category.slug,
      variantLabel: variant.label,
      unitPrice: variant.price,
      image: product.images[0]?.url,
    });
    toast(`Added ${product.name}`, { tone: "success", body: `${variant.label} · ${formatINR(variant.price)}` });
  };

  const egglessLabel = product.dietary.includes("eggless") ? "Eggless" : product.egglessOption.available ? "Eggless option" : null;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).springify().damping(18)} style={{ width }}>
      <Press onPress={() => router.push({ pathname: "/product/[slug]", params: { slug: product.slug } })} accessibilityRole="button" accessibilityLabel={`${product.name}, from ${formatINR(product.priceFrom)}`} scaleTo={0.97}>
        <View>
          <Plate name={product.name} category={product.category.slug} image={product.images[0]?.url} size={width} />
          <Press
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={product.isCustomizable ? `Design ${product.name}` : variant ? `Add ${product.name} to cart` : `${product.name} is sold out`}
            disabled={!variant && !product.isCustomizable}
            hitSlop={8}
            style={{ position: "absolute", right: 2, bottom: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: variant || product.isCustomizable ? c.text : c.plateRim, alignItems: "center", justifyContent: "center", elevation: 3, shadowColor: c.shadow, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}
          >
            <Plus size={20} color={c.bg} />
          </Press>
        </View>
        <View style={{ marginTop: 10, gap: 3 }}>
          <T weight="semi" numberOfLines={2} style={{ fontFamily: "Fraunces_600SemiBold", fontSize: 16, lineHeight: 20 }}>
            {product.name}
          </T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Price value={product.priceFrom} from={product.variants.length > 1} size="sm" />
            {egglessLabel ? <Tag label={egglessLabel} /> : null}
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}
