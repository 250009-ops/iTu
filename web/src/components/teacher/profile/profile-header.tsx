"use client";

import { useState } from "react";
import { Bell, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";
import { EditProfileDialog } from "@/components/teacher/profile/edit-profile-dialog";
import { NotificationPrefsDialog } from "@/components/teacher/profile/notification-prefs-dialog";

export function ProfileHeader() {
  const { raw, refresh } = useTeacherProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">
          Teacher Portal &gt; My Profile
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your examiner credentials and account settings.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setNotifyOpen(true)}
        >
          <Bell className="h-4 w-4" />
          Notifications
        </Button>
        <Button variant="primary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      {editOpen && (
        <EditProfileDialog
          initialName={raw.name}
          initialBio={raw.bio}
          initialSpeciality={raw.speciality}
          onClose={() => setEditOpen(false)}
          onDone={refresh}
        />
      )}
      {notifyOpen && (
        <NotificationPrefsDialog
          initialPrefs={raw.notificationPrefs}
          onClose={() => setNotifyOpen(false)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
