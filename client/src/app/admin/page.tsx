import { Dashboard } from "@/components/admin/Dashboard";

// The admin layout's title template only applies to child routes, so spell it out here.
export const metadata = { title: { absolute: "Dashboard · caketown admin" } };

export default function AdminHome() {
  return <Dashboard />;
}
