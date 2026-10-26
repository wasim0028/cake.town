import { useRouter } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { ProductCard } from "@/components/ProductCard";
import { Screen } from "@/components/Screen";
import { Button, Empty, Skeleton } from "@/components/ui";
import { useWishlist } from "@/lib/queries";

export default function Wishlist() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const q = useWishlist();
  const w = (width - 56) / 2;
  if (q.isPending) return <Screen header={false}><Skeleton height={200} /></Screen>;
  if (!q.data?.length) return <Empty art={["Red Velvet Cupcakes", "cupcakes"]} title="Nothing saved yet" body="Tap the heart on anything you'd like to order again." action={<Button title="Find something" onPress={() => router.navigate("/(tabs)/shop")} />} />;
  return (
    <Screen header={false} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {q.data.map((p, i) => (
          <ProductCard key={p.id} product={p} width={w} index={i} />
        ))}
      </View>
    </Screen>
  );
}
