import { WaitingSpeakingView } from "@/components/exam/flow/waiting-speaking-view";

export default async function WaitingSpeakingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <WaitingSpeakingView sessionId={sessionId} />;
}
