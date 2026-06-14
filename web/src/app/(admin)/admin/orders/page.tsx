import type { Metadata } from "next";
import { OrdersView } from "@/components/admin/orders/orders-view";

export const metadata: Metadata = { title: "Orders & Payments" };

export default function AdminOrdersPage() {
  return <OrdersView />;
}
