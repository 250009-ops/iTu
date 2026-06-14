import { BreakView } from "@/components/exam/flow/break-view";

export default async function BreakPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ from?: string; next?: string }>;
}) {
  const { sessionId } = await params;
  const { from = "listening", next = "reading" } = await searchParams;
  return <BreakView sessionId={sessionId} from={from} next={next} />;
}
