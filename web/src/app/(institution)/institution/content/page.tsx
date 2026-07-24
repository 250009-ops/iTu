import { redirect } from "next/navigation";

export default function InstitutionContentRedirectPage() {
  redirect("/institution/tests?tab=studio");
}
