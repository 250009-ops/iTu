import { redirect } from "next/navigation";

// Institutions content now lives on the Edu Centers page (/centers#partner).
export default function ForInstitutionsPage() {
  redirect("/centers#partner");
}
