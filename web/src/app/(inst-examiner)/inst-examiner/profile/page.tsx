import type { Metadata } from "next";
import { InstExaminerProfileView } from "@/components/inst-examiner/profile-view";

export const metadata: Metadata = { title: "Examiner Profile | Centre Examiner" };

export default function InstExaminerProfilePage() {
  return <InstExaminerProfileView />;
}
