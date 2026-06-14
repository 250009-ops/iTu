import { redirect } from "next/navigation";

export default function LegacyBrowseRedirect() {
  redirect("/student/browse");
}
