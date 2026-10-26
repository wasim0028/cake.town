import { Pencil, Star, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AddressForm } from "@/components/AddressForm";
import { Row, Screen } from "@/components/Screen";
import { Button, Card, Empty, Skeleton, T, Tag } from "@/components/ui";
import { api } from "@/lib/api";
import { useAddresses } from "@/lib/queries";
import { toast } from "@/lib/stores";
import { useTheme } from "@/lib/theme";

export default function Addresses() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const q = useAddresses();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["addresses"] });

  return (
    <Screen header={false}>
      {editing === "new" ? (
        <Card>
          <AddressForm onSaved={() => (setEditing(null), refresh(), toast("Address saved", { tone: "success" }))} onCancel={() => setEditing(null)} />
        </Card>
      ) : (
        <Button title="Add an address" variant="secondary" onPress={() => setEditing("new")} />
      )}
      {q.isPending ? (
        <Skeleton height={100} />
      ) : !q.data?.length && editing !== "new" ? (
        <Empty title="No saved addresses" body="Save your home or office so checkout takes seconds." />
      ) : (
        q.data?.map((a) => (
          <Card key={a.id}>
            {editing === a.id ? (
              <AddressForm initial={a} onSaved={() => (setEditing(null), refresh(), toast("Address updated", { tone: "success" }))} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <Row>
                  <T weight="bold">{a.label}</T>
                  {a.isDefault && <Tag label="Default" />}
                </Row>
                <T tone="muted">
                  {a.fullName}, {a.phone}
                  {"\n"}
                  {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}
                  {"\n"}
                  {a.city}, {a.state} {a.pincode}
                </T>
                <Row style={{ flexWrap: "wrap" }}>
                  <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={15} color={c.text} />} onPress={() => setEditing(a.id)} />
                  {!a.isDefault && <Button size="sm" variant="ghost" title="Make default" icon={<Star size={15} color={c.text} />} onPress={async () => (await api.patch(`/me/addresses/${a.id}`, { isDefault: true }), refresh())} />}
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Delete"
                    icon={<Trash2 size={15} color={c.danger} />}
                    onPress={() =>
                      Alert.alert(`Delete the ${a.label.toLowerCase()} address?`, undefined, [
                        { text: "Keep", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: async () => (await api.del(`/me/addresses/${a.id}`), refresh()) },
                      ])
                    }
                  />
                </Row>
              </>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
