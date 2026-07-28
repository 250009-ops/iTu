"use client";

import { useEffect, useState } from "react";
import type { TrackReference } from "@livekit/components-react";
import {
  ParticipantEvent,
  Track,
  TrackEvent,
  type Participant,
  type RemoteTrackPublication,
} from "livekit-client";

function buildCameraTrackRef(
  participant: Participant,
): TrackReference | undefined {
  const publication = participant.getTrackPublication(Track.Source.Camera);
  if (!publication) return undefined;

  return {
    participant,
    publication,
    source: Track.Source.Camera,
  };
}

function cameraPublicationVisible(
  participant: Participant,
  publication: RemoteTrackPublication | ReturnType<
    Participant["getTrackPublication"]
  >,
): boolean {
  if (!publication || publication.isMuted) return false;

  const videoTrack = publication.videoTrack ?? publication.track;
  if (videoTrack) return true;

  if (!participant.isCameraEnabled) return false;

  if (participant.isLocal) return true;

  return "isSubscribed" in publication ? publication.isSubscribed : false;
}

/** Keeps a camera TrackReference in sync with participant publish/subscribe events. */
export function useCameraTrackRef(
  participant: Participant | undefined,
): TrackReference | undefined {
  const [trackRef, setTrackRef] = useState<TrackReference | undefined>();
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!participant) {
      setTrackRef(undefined);
      return;
    }

    const bump = () => setRevision((n) => n + 1);

    const sync = () => {
      const publication = participant.getTrackPublication(Track.Source.Camera);
      if (!publication || !cameraPublicationVisible(participant, publication)) {
        setTrackRef(undefined);
        bump();
        return;
      }

      setTrackRef(buildCameraTrackRef(participant));
      bump();
    };

    sync();

    const onCameraTrackChanged = (
      _track: unknown,
      publication?: { source?: Track.Source },
    ) => {
      if (!publication || publication.source === Track.Source.Camera) sync();
    };

    participant.on(ParticipantEvent.TrackSubscribed, onCameraTrackChanged);
    participant.on(ParticipantEvent.TrackUnsubscribed, onCameraTrackChanged);
    participant.on(ParticipantEvent.TrackPublished, onCameraTrackChanged);
    participant.on(ParticipantEvent.TrackUnpublished, onCameraTrackChanged);
    participant.on(ParticipantEvent.LocalTrackPublished, onCameraTrackChanged);
    participant.on(ParticipantEvent.LocalTrackUnpublished, onCameraTrackChanged);
    participant.on(ParticipantEvent.TrackMuted, onCameraTrackChanged);
    participant.on(ParticipantEvent.TrackUnmuted, onCameraTrackChanged);
    participant.on(ParticipantEvent.TrackSubscriptionStatusChanged, sync);
    participant.on(ParticipantEvent.ParticipantMetadataChanged, sync);

    const publication = participant.getTrackPublication(Track.Source.Camera);
    const publicationListeners: Array<() => void> = [];
    if (publication) {
      const onTrackEvent = () => sync();
      publication.on(TrackEvent.Subscribed, onTrackEvent);
      publication.on(TrackEvent.Unsubscribed, onTrackEvent);
      publication.on(TrackEvent.Muted, onTrackEvent);
      publication.on(TrackEvent.Unmuted, onTrackEvent);
      publicationListeners.push(() => {
        publication.off(TrackEvent.Subscribed, onTrackEvent);
        publication.off(TrackEvent.Unsubscribed, onTrackEvent);
        publication.off(TrackEvent.Muted, onTrackEvent);
        publication.off(TrackEvent.Unmuted, onTrackEvent);
      });
    }

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onCameraTrackChanged);
      participant.off(ParticipantEvent.TrackUnsubscribed, onCameraTrackChanged);
      participant.off(ParticipantEvent.TrackPublished, onCameraTrackChanged);
      participant.off(ParticipantEvent.TrackUnpublished, onCameraTrackChanged);
      participant.off(ParticipantEvent.LocalTrackPublished, onCameraTrackChanged);
      participant.off(ParticipantEvent.LocalTrackUnpublished, onCameraTrackChanged);
      participant.off(ParticipantEvent.TrackMuted, onCameraTrackChanged);
      participant.off(ParticipantEvent.TrackUnmuted, onCameraTrackChanged);
      participant.off(ParticipantEvent.TrackSubscriptionStatusChanged, sync);
      participant.off(ParticipantEvent.ParticipantMetadataChanged, sync);
      publicationListeners.forEach((dispose) => dispose());
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

export function cameraFeedVisible(
  participant: Participant | undefined,
  trackRef: TrackReference | undefined,
): boolean {
  if (!participant || !trackRef?.publication) return false;
  return cameraPublicationVisible(participant, trackRef.publication);
}
