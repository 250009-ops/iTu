"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { pickRemoteParticipant } from "@/hooks/use-camera-track-ref";
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
  type SpeakingStudentIntegrityEvent,
  resolveIncomingPhase,
} from "@/lib/speaking/sync";
import { playPrepEndBell } from "@/lib/speaking/prep-bell";

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
  examinerLeft: boolean;
  studentIntegrityAlert: SpeakingStudentIntegrityEvent | null;
  part2PrepStartedAt: number | null;
  part2SpeakStartedAt: number | null;
  setPhase: (phase: SpeakingPhase) => Promise<void>;
  endSession: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  publishSync: (message: SpeakingSyncMessage) => Promise<void>;
  refreshState: () => Promise<void>;
  clearStudentIntegrityAlert: () => void;
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
  const [part2PrepStartedAt, setPart2PrepStartedAt] = useState<number | null>(null);
  const [part2SpeakStartedAt, setPart2SpeakStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (phase === "part2-prep" && !part2SpeakStartedAt && !part2PrepStartedAt) {
      setPart2PrepStartedAt(Date.now());
    }
    if (phase === "part2-speak" && !part2SpeakStartedAt) {
      setPart2SpeakStartedAt(Date.now());
    }
  }, [phase, part2PrepStartedAt, part2SpeakStartedAt]);

  const applyPhase = useCallback(
    (incoming: SpeakingPhase) => {
      setPhaseState((prev) =>
        resolveIncomingPhase(incoming, prev, part2SpeakStartedAt !== null),
      );
    },
    [part2SpeakStartedAt],
  );

  const refreshState = useCallback(async () => {
    const next = await getSpeakingState(speakingSessionId);
    setState(next);
    if (next.activePhase) {
      applyPhase(next.activePhase);
    } else if (next.status === "completed") {
      setPhaseState("complete");
    }
  }, [speakingSessionId, applyPhase]);

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
          if (
            isLivekitConfigError(message) ||
            !currentState.livekitConfigured
          ) {
            join = {
              token: "",
              serverUrl: "",
              roomName: currentState.roomName,
              role: role === "examiner" ? "examiner" : "student",
              speakingSessionId,
              livekitConfigured: false,
              recordingEnabled: false,
            };
          } else if (currentState.joinAllowed === false && currentState.joinMessage) {
            throw new Error(currentState.joinMessage);
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
      part2PrepStartedAt,
      part2SpeakStartedAt,
      applyPhase,
    }),
    [
      role,
      speakingSessionId,
      joinInfo,
      state,
      phase,
      loading,
      error,
      refreshState,
      part2PrepStartedAt,
      part2SpeakStartedAt,
      applyPhase,
    ],
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
      <OfflineSpeakingRoomProvider shell={shellValue} setState={setState}>
        {children}
      </OfflineSpeakingRoomProvider>
    );
  }

  return (
    <LiveKitRoom
      token={joinInfo.token}
      serverUrl={joinInfo.serverUrl}
      connect
      audio={{
        echoCancellation: true,
        noiseSuppression: true,
      }}
      video={{
        facingMode: "user",
        resolution: { width: 1280, height: 720, frameRate: 24 },
      }}
      connectOptions={{ autoSubscribe: true }}
      options={{ adaptiveStream: true, dynacast: true }}
      data-lk-theme="default"
      className="h-full w-full"
    >
      <RoomAudioRenderer />
      <EnsureMediaEnabled />
      <SpeakingRoomInner shell={shellValue} setState={setState}>
        {children}
      </SpeakingRoomInner>
    </LiveKitRoom>
  );
}

type SpeakingRoomShell = {
  role: SpeakingRoomRole;
  speakingSessionId: string;
  joinInfo: SpeakingJoinResponse | null;
  state: SpeakingState | null;
  phase: SpeakingPhase;
  loading: boolean;
  error: string | null;
  refreshState: () => Promise<void>;
  part2PrepStartedAt: number | null;
  part2SpeakStartedAt: number | null;
  applyPhase: (phase: SpeakingPhase) => void;
};

function OfflineSpeakingRoomProvider({
  shell,
  setState,
  children,
}: {
  shell: SpeakingRoomShell;
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
      const resolved = resolveIncomingPhase(
        nextPhase,
        shell.phase,
        shell.part2SpeakStartedAt !== null,
      );
      if (resolved === shell.phase) return;
      const updated = await updateSpeakingState(shell.speakingSessionId, {
        activePhase: resolved,
      });
      setState(updated);
      shell.applyPhase(updated.activePhase);
    },
    [shell, setState],
  );

  const endSession = useCallback(async () => {
    const updated = await updateSpeakingState(shell.speakingSessionId, {
      endSession: true,
      activePhase: "complete",
    });
    setState(updated);
    shell.applyPhase("complete");
  }, [shell, setState]);

  const leaveRoom = useCallback(async () => undefined, []);

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
      examinerLeft: false,
      studentIntegrityAlert: null,
      part2PrepStartedAt: shell.part2PrepStartedAt,
      part2SpeakStartedAt: shell.part2SpeakStartedAt,
      setPhase,
      endSession,
      leaveRoom,
      publishSync,
      refreshState: shell.refreshState,
      clearStudentIntegrityAlert: () => undefined,
      error: shell.error,
      loading: shell.loading,
    }),
    [shell, setPhase, endSession, leaveRoom, publishSync],
  );

  return (
    <SpeakingRoomContext.Provider value={value}>
      {children}
    </SpeakingRoomContext.Provider>
  );
}

function EnsureMediaEnabled() {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected || !localParticipant) {
      return;
    }

    let cancelled = false;

    async function enableMedia() {
      try {
        if (!localParticipant.isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(true);
        }
        if (!localParticipant.isCameraEnabled) {
          await localParticipant.setCameraEnabled(true, {
            facingMode: "user",
            resolution: { width: 1280, height: 720, frameRate: 24 },
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Could not enable camera/microphone:", err);
        }
      }
    }

    const onReconnect = () => {
      void enableMedia();
    };

    void enableMedia();
    room.on(RoomEvent.Reconnected, onReconnect);
    return () => {
      cancelled = true;
      room.off(RoomEvent.Reconnected, onReconnect);
    };
  }, [connectionState, localParticipant, room]);

  return null;
}

function SpeakingRoomInner({
  shell,
  setState,
  children,
}: {
  shell: SpeakingRoomShell;
  setState: (state: SpeakingState | null) => void;
  children: ReactNode;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const remoteParticipant = pickRemoteParticipant(
    participants,
  ) as RemoteParticipant | undefined;
  const prepBellRef = useRef(false);
  const [examinerLeft, setExaminerLeft] = useState(false);
  const [studentIntegrityAlert, setStudentIntegrityAlert] =
    useState<SpeakingStudentIntegrityEvent | null>(null);

  useEffect(() => {
    prepBellRef.current = false;
  }, [shell.phase]);

  const prevRemoteSidRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const sid = remoteParticipant?.sid;
    const prevSid = prevRemoteSidRef.current;
    prevRemoteSidRef.current = sid;

    if (shell.role !== "student" || !examinerLeft) return;
    if (!prevSid && sid) {
      setExaminerLeft(false);
    }
  }, [shell.role, examinerLeft, remoteParticipant?.sid]);

  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      const message = decodeSyncMessage(payload);
      if (!message) return;
      if (message.type === "phase") {
        shell.applyPhase(message.phase);
      }
      if (message.type === "session-end") {
        shell.applyPhase("complete");
      }
      if (message.type === "examiner-left" && shell.role === "student") {
        setExaminerLeft(true);
      }
      if (message.type === "student-integrity" && shell.role === "examiner") {
        setStudentIntegrityAlert(message.event);
      }
      if (message.type === "prep-end" && !prepBellRef.current) {
        prepBellRef.current = true;
        playPrepEndBell();
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, shell]);

  const clearStudentIntegrityAlert = useCallback(
    () => setStudentIntegrityAlert(null),
    [],
  );

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
      const resolved = resolveIncomingPhase(
        nextPhase,
        shell.phase,
        shell.part2SpeakStartedAt !== null,
      );
      if (resolved === shell.phase) return;
      const updated = await updateSpeakingState(shell.speakingSessionId, {
        activePhase: resolved,
      });
      setState(updated);
      shell.applyPhase(updated.activePhase);
      if (shell.role === "examiner") {
        await publishSync({ type: "phase", phase: resolved });
      }
    },
    [shell, publishSync, setState],
  );

  const endSession = useCallback(async () => {
    const updated = await updateSpeakingState(shell.speakingSessionId, {
      endSession: true,
      activePhase: "complete",
    });
    setState(updated);
    shell.applyPhase("complete");
    if (shell.role === "examiner") {
      await publishSync({ type: "session-end" });
    }
  }, [shell, publishSync, setState]);

  const leaveRoom = useCallback(async () => {
    room.disconnect();
  }, [room]);

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
      examinerLeft,
      studentIntegrityAlert,
      part2PrepStartedAt: shell.part2PrepStartedAt,
      part2SpeakStartedAt: shell.part2SpeakStartedAt,
      setPhase,
      endSession,
      leaveRoom,
      publishSync,
      refreshState: shell.refreshState,
      clearStudentIntegrityAlert,
      error: shell.error,
      loading: shell.loading,
    }),
    [
      shell,
      connectionState,
      participants.length,
      remoteParticipant,
      examinerLeft,
      studentIntegrityAlert,
      setPhase,
      endSession,
      leaveRoom,
      publishSync,
      clearStudentIntegrityAlert,
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
