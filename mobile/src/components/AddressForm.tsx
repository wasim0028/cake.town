import { useState } from "react";
import { View } from "react-native";
import type { Address } from "@caketown/shared";
import { api, errorsFrom } from "@/lib/api";
import { useAuth } from "@/lib/stores";
import { Row } from "./Screen";
import { Button, Chip, Field, FormError } from "./ui";

type Draft = Omit<Address, "id" | "location" | "isDefault">;

export function AddressForm({ initial, onSaved, onCancel }: { initial?: Address; onSaved: (a: Address) => void; onCancel?: () => void }) {
  const user = useAuth((s) => s.user);
  const [f, setF] = useState<Draft>({
    label: initial?.label ?? "Home",
    fullName: initial?.fullName ?? user?.name ?? "",
    phone: initial?.phone ?? user?.phone ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    landmark: initial?.landmark ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const set = (k: keyof Draft) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErrors({ fields: {} });
    const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    try {
      const r = initial ? await api.patch<{ address: Address }>(`/me/addresses/${initial.id}`, body) : await api.post<{ address: Address }>("/me/addresses", body);
      onSaved(r.address);
    } catch (e) {
      setErrors(errorsFrom(e));
    } finally {
      setBusy(false);
    }
  };

  const e = errors.fields;
  return (
    <View style={{ gap: 14 }}>
      <Row>
        {["Home", "Work", "Other"].map((l) => (
          <Chip key={l} label={l} selected={f.label === l} onPress={() => set("label")(l)} />
        ))}
      </Row>
      <Field label="Full name" value={f.fullName} onChangeText={set("fullName")} autoComplete="name" error={e.fullName} />
      <Field label="Mobile number" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" hint="The rider calls this number" error={e.phone} />
      <Field label="House, flat, building" value={f.line1} onChangeText={set("line1")} autoComplete="address-line1" error={e.line1} />
      <Field label="Area, street" optional value={f.line2} onChangeText={set("line2")} error={e.line2} />
      <Field label="Landmark" optional value={f.landmark} onChangeText={set("landmark")} placeholder="Near the temple gate" error={e.landmark} />
      <Row style={{ alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Field label="Pincode" value={f.pincode} onChangeText={set("pincode")} keyboardType="number-pad" maxLength={6} autoComplete="postal-code" error={e.pincode} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Field label="City" value={f.city} onChangeText={set("city")} error={e.city} />
        </View>
      </Row>
      <Field label="State" value={f.state} onChangeText={set("state")} placeholder="Karnataka" error={e.state} />
      <FormError message={errors.message} />
      <Row>
        <Button title={initial ? "Save address" : "Use this address"} loading={busy} onPress={save} style={{ flex: 1 }} />
        {onCancel && <Button title="Cancel" variant="ghost" onPress={onCancel} />}
      </Row>
    </View>
  );
}
