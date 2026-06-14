"use client";

import { useEffect, useState } from "react";
import type { TrackReference } from "@livekit/components-react";
import {
  ParticipantEvent,
  Track,
  type Participant,
} from "livekit-client";

/** Keeps a camera TrackReference in sync with participant publish/subscribe events. */
export function useCameraTrackRef(
  participant: Participant | undefined,
): TrackReference | undefined {
  const [trackRef, setTrackRef] = useState<TrackReference | undefined>();

  useEffect(() => {
    if (!participant) {
      setTrackRef(undefined);
      return;
    }

    const sync = () => {
      const publication = participant.getTrackPublication(Track.Source.Camera);
      if (!publication) {
        setTrackRef(undefined);
        return;
      }

      setTrackRef({
        participant,
        publication,
        source: Track.Source.Camera,
      });
    };

    sync();
    participant.on(ParticipantEvent.TrackSubscribed, sync);
    participant.on(ParticipantEvent.TrackUnsubscribed, sync);
    participant.on(ParticipantEvent.TrackPublished, sync);
    participant.on(ParticipantEvent.TrackUnpublished, sync);
    participant.on(ParticipantEvent.LocalTrackPublished, sync);
    participant.on(ParticipantEvent.LocalTrackUnpublished, sync);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, sync);
      participant.off(ParticipantEvent.TrackUnsubscribed, sync);
      participant.off(ParticipantEvent.TrackPublished, sync);
      participant.off(ParticipantEvent.TrackUnpublished, sync);
      participant.off(ParticipantEvent.LocalTrackPublished, sync);
      participant.off(ParticipantEvent.LocalTrackUnpublished, sync);
    };
  }, [participant]);

  return trackRef;
}

export function parseParticipantRole(participant: Participant): string | null {
  if (!participant.metadata) return null;
  try {
    const meta = JSON.parse(participant.metadata) as { role?: string };
    return meta.role ?? null;
  } catch {
    return null;
  }
}

/** Prefer examiner/student humans; ignore recorder/egress bots. */
export function pickRemoteParticipant(
  participants: Participant[],
): Participant | undefined {
  const remotes = participants.filter((p) => !p.isLocal);
  const humans = remotes.filter((p) => {
    const role = parseParticipantRole(p);
    if (role === "examiner" || role === "student") return true;
    if (p.identity.startsWith("EG_")) return false;
    return role === null;
  });
  return humans[0] ?? remotes[0];
}
