"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  ConnectionState,
  RoomEvent,
  type RemoteParticipant,
} from "livekit-client";
import {
  getSpeakingState,
  joinSpeakingSession,
  updateSpeakingState,
  type SpeakingJoinResponse,
  type SpeakingState,
} from "@/lib/api/speaking";
import {
  SPEAKING_SYNC_TOPIC,
  decodeSyncMessage,
  encodeSyncMessage,
  type SpeakingPhase,
  type SpeakingSyncMessage,
} from "@/lib/speaking/sync";

type SpeakingRoomRole = "examiner" | "student";

type SpeakingRoomContextValue = {
  role: SpeakingRoomRole;
  speakingSessionId: string;
  joinInfo: SpeakingJoinResponse | null;
  state: SpeakingState | null;
  phase: SpeakingPhase;
  connectionState: ConnectionState;
  participantCount: number;
  remoteParticipant: RemoteParticipant | undefined;
  isConnected: boolean;
  livekitConfigured: boolean;
  setPhase: (phase: SpeakingPhase) => Promise<void>;
  endSession: () => Promise<void>;
  publishSync: (message: SpeakingSyncMessage) => Promise<void>;
  refreshState: () => Promise<void>;
  error: string | null;
  loading: boolean;
};

const SpeakingRoomContext = createContext<SpeakingRoomContextValue | null>(null);

function isLivekitConfigError(message: string) {
  return /livekit is not configured/i.test(message);
}

export function SpeakingRoomProvider({
  speakingSessionId,
  role,
  initialPhase = "part1",
  children,
}: {
  speakingSessionId: string;
  role: SpeakingRoomRole;
  initialPhase?: SpeakingPhase;
  children: ReactNode;
}) {
  const [joinInfo, setJoinInfo] = useState<SpeakingJoinResponse | null>(null);
  const [state, setState] = useState<SpeakingState | null>(null);
  const [phase, setPhaseState] = useState<SpeakingPhase>(initialPhase);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const next = await getSpeakingState(speakingSessionId);
    setState(next);
    if (next.activePhase) {
      setPhaseState(next.activePhase);
    }
  }, [speakingSessionId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const currentState = await getSpeakingState(speakingSessionId);
        if (cancelled) return;

        setState(currentState);
        setPhaseState(currentState.activePhase ?? initialPhase);

        let join: SpeakingJoinResponse;
        try {
          join = await joinSpeakingSession(speakingSessionId);
        } catch (joinErr) {
          const message =
            joinErr instanceof Error ? joinErr.message : "Failed to join room";
          if (isLivekitConfigError(message) || !currentState.livekitConfigured) {
            join = {
              token: "",
              serverUrl: "",
              roomName: currentState.roomName,
              role: role === "examiner" ? "examiner" : "student",
              speakingSessionId,
              livekitConfigured: false,
            };
          } else {
            throw joinErr;
          }
        }

        if (cancelled) return;
        setJoinInfo(join);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load speaking room",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [speakingSessionId, initialPhase, role]);

  const shellValue = useMemo(
    () => ({
      role,
      speakingSessionId,
      joinInfo,
      state,
      phase,
      loading,
      error,
      refreshState,
    }),
    [role, speakingSessionId, joinInfo, state, phase, loading, error, refreshState],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error || !joinInfo || !state) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Failed to load speaking session</p>
          <p className="mt-1">{error ?? "Unable to connect to speaking session"}</p>
        </div>
      </div>
    );
  }

  if (!joinInfo.livekitConfigured) {
    return (
      <OfflineSpeakingRoomProvider shell={shellValue} setPhaseState={setPhaseState} setState={setState}>
        {children}
      </OfflineSpeakingRoomProvider>
    );
  }

  return (
    <LiveKitRoom
      token={joinInfo.token}
      serverUrl={joinInfo.serverUrl}
      connect
      audio
      video
      data-lk-theme="default"
      className="h-full w-full"
    >
      <RoomAudioRenderer />
      <SpeakingRoomInner
        shell={shellValue}
        setPhaseState={setPhaseState}
        setState={setState}
      >
        {children}
      </SpeakingRoomInner>
    </LiveKitRoom>
  );
}

function OfflineSpeakingRoomProvider({
  shell,
  setPhaseState,
  setState,
  children,
}: {
  shell: {
    role: SpeakingRoomRole;
    speakingSessionId: string;
    joinInfo: SpeakingJoinResponse | null;
    state: SpeakingState | null;
    phase: SpeakingPhase;
    loading: boolean;
    error: string | null;
    refreshState: () => Promise<void>;
  };
  setPhaseState: (phase: SpeakingPhase) => void;
  setState: (state: SpeakingState | null) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (shell.phase === "complete") return;
    const id = window.setInterval(() => {
      void shell.refreshState();
    }, 5000);
    return () => window.clearInterval(id);
  }, [shell.phase, shell.refreshState]);

  const publishSync = useCallback(async () => undefined, []);

  const setPhase = useCallback(
    async (nextPhase: SpeakingPhase) => {
      const updated = await updateSpeakingState(shell.speakingSessionId, {
        activePhase: nextPhase,
      });
      setState(updated);
      setPhaseState(updated.activePhase);
    },
    [shell.speakingSessionId, setPhaseState, setState],
  );

  const endSession = useCallback(async () => {
    const updated = await updateSpeakingState(shell.speakingSessionId, {
      endSession: true,
      activePhase: "complete",
    });
    setState(updated);
    setPhaseState("complete");
  }, [shell.speakingSessionId, setPhaseState, setState]);

  const value = useMemo<SpeakingRoomContextValue>(
    () => ({
      role: shell.role,
      speakingSessionId: shell.speakingSessionId,
      joinInfo: shell.joinInfo,
      state: shell.state,
      phase: shell.phase,
      connectionState: ConnectionState.Disconnected,
      participantCount: 0,
      remoteParticipant: undefined,
      isConnected: false,
      livekitConfigured: false,
      setPhase,
      endSession,
      publishSync,
      refreshState: shell.refreshState,
      error: shell.error,
      loading: shell.loading,
    }),
    [shell, setPhase, endSession, publishSync],
  );

  return (
    <SpeakingRoomContext.Provider value={value}>
      {children}
    </SpeakingRoomContext.Provider>
  );
}

function SpeakingRoomInner({
  shell,
  setPhaseState,
  setState,
  children,
}: {
  shell: {
    role: SpeakingRoomRole;
    speakingSessionId: string;
    joinInfo: SpeakingJoinResponse | null;
    state: SpeakingState | null;
    phase: SpeakingPhase;
    loading: boolean;
    error: string | null;
    refreshState: () => Promise<void>;
  };
  setPhaseState: (phase: SpeakingPhase) => void;
  setState: (state: SpeakingState | null) => void;
  children: ReactNode;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const remoteParticipant = participants.find(
    (p) => !p.isLocal,
  ) as RemoteParticipant | undefined;

  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      const message = decodeSyncMessage(payload);
      if (!message) return;
      if (message.type === "phase") {
        setPhaseState(message.phase);
      }
      if (message.type === "session-end") {
        setPhaseState("complete");
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, setPhaseState]);

  useEffect(() => {
    if (shell.phase === "complete") return;
    const id = window.setInterval(() => {
      void shell.refreshState();
    }, 5000);
    return () => window.clearInterval(id);
  }, [shell.phase, shell.refreshState]);

  const publishSync = useCallback(
    async (message: SpeakingSyncMessage) => {
      if (!localParticipant) return;
      await localParticipant.publishData(encodeSyncMessage(message), {
        reliable: true,
        topic: SPEAKING_SYNC_TOPIC,
      });
    },
    [localParticipant],
  );

  const setPhase = useCallback(
    async (nextPhase: SpeakingPhase) => {
      const updated = await updateSpeakingState(shell.speakingSessionId, {
        activePhase: nextPhase,
      });
      setState(updated);
      setPhaseState(updated.activePhase);
      if (shell.role === "examiner") {
        await publishSync({ type: "phase", phase: nextPhase });
      }
    },
    [shell.role, shell.speakingSessionId, publishSync, setPhaseState, setState],
  );

  const endSession = useCallback(async () => {
    const updated = await updateSpeakingState(shell.speakingSessionId, {
      endSession: true,
      activePhase: "complete",
    });
    setState(updated);
    setPhaseState("complete");
    if (shell.role === "examiner") {
      await publishSync({ type: "session-end" });
    }
  }, [shell.role, shell.speakingSessionId, publishSync, setPhaseState, setState]);

  const value = useMemo<SpeakingRoomContextValue>(
    () => ({
      role: shell.role,
      speakingSessionId: shell.speakingSessionId,
      joinInfo: shell.joinInfo,
      state: shell.state,
      phase: shell.phase,
      connectionState,
      participantCount: participants.length,
      remoteParticipant,
      isConnected: connectionState === ConnectionState.Connected,
      livekitConfigured: true,
      setPhase,
      endSession,
      publishSync,
      refreshState: shell.refreshState,
      error: shell.error,
      loading: shell.loading,
    }),
    [
      shell,
      connectionState,
      participants.length,
      remoteParticipant,
      setPhase,
      endSession,
      publishSync,
    ],
  );

  return (
    <SpeakingRoomContext.Provider value={value}>
      {children}
    </SpeakingRoomContext.Provider>
  );
}

export function useSpeakingRoom() {
  const ctx = useContext(SpeakingRoomContext);
  if (!ctx) {
    throw new Error("useSpeakingRoom requires SpeakingRoomProvider");
  }
  return ctx;
}

export function LivekitSetupNotice() {
  return (
    <div className="flex min-h-[320px] flex-col justify-center rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 lg:min-h-[480px]">
      <p className="font-semibold text-base">LiveKit video is not configured</p>
      <p className="mt-2 text-amber-900">
        Speaking sessions need LiveKit credentials in{" "}
        <code className="rounded bg-amber-100 px-1">api/.env</code>. Session
        controls and grading still work; video will connect once configured.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-amber-100/80 p-3 text-xs">
{`LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret`}
      </pre>
      <p className="mt-4 text-amber-900">
        Create a free project at{" "}
        <a
          href="https://cloud.livekit.io"
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline"
        >
          cloud.livekit.io
        </a>
        , add the keys above, then restart the API server.
      </p>
    </div>
  );
}
