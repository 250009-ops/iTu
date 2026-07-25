import type { Metadata } from "next";
import { AccountView } from "@/components/admin/account/account-view";

export const metadata: Metadata = { title: "Account Security" };

export default function AdminAccountPage() {
  return <AccountView />;
}
