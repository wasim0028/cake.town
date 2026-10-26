import { Modal, Platform, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CheckoutResponse } from "@caketown/shared";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Button, H, T } from "./ui";

export type PayResult = { status: "paid" | "processing" } | { status: "dismissed" } | { status: "failed"; message: string };
type Rp = NonNullable<CheckoutResponse["razorpay"]>;

/** Razorpay Checkout runs in a small web page inside the app, so it works in Expo Go and builds alike. */
function html(rp: Rp, description: string) {
  const opts = JSON.stringify({
    key: rp.keyId,
    amount: rp.amount,
    currency: rp.currency,
    name: rp.name,
    description,
    order_id: rp.orderId,
    prefill: rp.prefill,
    theme: { color: "#C8893B" },
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body style="margin:0;background:#F7F1E7">
<script>
  function send(m){ window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  var o = ${opts};
  o.handler = function(r){ send({ type: "success", r: r }); };
  o.modal = { ondismiss: function(){ send({ type: "dismiss" }); } };
  function start(){
    if (!window.Razorpay) { send({ type: "failed", message: "Couldn't load the payment window." }); return; }
    var c = new Razorpay(o);
    c.on("payment.failed", function(r){ send({ type: "failed", message: (r.error && r.error.description) || "The payment didn't go through." }); });
    c.open();
  }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
</script></body></html>`;
}

export function RazorpaySheet({ rp, description, onDone }: { rp: Rp | null; description: string; onDone: (r: PayResult) => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const onMessage = async (e: WebViewMessageEvent) => {
    const m = JSON.parse(e.nativeEvent.data) as { type: string; message?: string; r?: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string } };
    if (m.type === "dismiss") return onDone({ status: "dismissed" });
    if (m.type === "failed") return onDone({ status: "failed", message: m.message ?? "The payment didn't go through." });
    if (m.type === "success" && m.r) {
      try {
        const v = await api.post<{ status: "paid" | "processing" }>("/payments/razorpay/verify", {
          razorpayOrderId: m.r.razorpay_order_id,
          razorpayPaymentId: m.r.razorpay_payment_id,
          razorpaySignature: m.r.razorpay_signature,
        });
        onDone({ status: v.status });
      } catch {
        // The server's webhook will still confirm it.
        onDone({ status: "processing" });
      }
    }
  };

  return (
    <Modal visible={Boolean(rp)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onDone({ status: "dismissed" })}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingBottom: insets.bottom }}>
        {rp && Platform.OS !== "web" ? (
          <WebView originWhitelist={["*"]} source={{ html: html(rp, description), baseUrl: "https://checkout.razorpay.com" }} onMessage={onMessage} javaScriptEnabled />
        ) : (
          <View style={{ padding: 24, gap: 12 }}>
            <H size="lg">Online payment</H>
            <T tone="muted">Paying online works in the Android and iPhone apps. In this browser preview, choose cash on delivery.</T>
            <Button title="Close" onPress={() => onDone({ status: "dismissed" })} />
          </View>
        )}
      </View>
    </Modal>
  );
}
