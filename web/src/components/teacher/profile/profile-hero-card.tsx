"use client";

import { useRef, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  Camera,
  Loader2,
  Mail,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";
import { useProfilePortal } from "@/contexts/profile-portal-context";
import { useToast } from "@/components/ui/toast";
import { updateTeacherProfile } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function StarRating({
  rating,
  reviewCount,
}: {
  rating: number | null;
  reviewCount: number;
}) {
  if (rating == null || reviewCount === 0) {
    return <p className="text-sm text-muted">No reviews yet</p>;
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : i < rating
                ? "fill-amber-200 text-amber-400"
                : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-navy">{rating}</span>
      <span className="text-sm text-muted">
        ({reviewCount.toLocaleString()})
      </span>
    </div>
  );
}

export function ProfileHeroCard() {
  const { profile, refresh } = useTeacherProfile();
  const { variant, centerName } = useProfilePortal();
  const isCentre = variant === "centre";
  const {
    name,
    initials,
    avatarUrl,
    title,
    email,
    memberSince,
    verified,
    rating,
    reviewCount,
  } = profile;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Unsupported file", {
        description: "Please choose an image file.",
        variant: "error",
      });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast("Image too large", {
        description: "Choose an image under 2 MB.",
        variant: "error",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUploading(true);
      try {
        await updateTeacherProfile({ avatarUrl: dataUrl });
        await refresh();
        toast("Photo updated", {
          description: "Your profile photo has been saved.",
          variant: "success",
        });
      } catch (err) {
        toast("Could not update photo", {
          description: getErrorMessage(err, "Please try again."),
          variant: "error",
        });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />
      <div className="relative h-20 bg-navy">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-colors hover:bg-white/20 disabled:opacity-50"
          aria-label="Change profile photo"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 pb-5">
        <div className="relative -mt-10 flex items-end gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-violet-600 text-2xl font-bold text-white shadow-md disabled:opacity-70"
              aria-label="Change profile photo"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </button>
          </div>
          {verified && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              <BadgeCheck className="h-3 w-3" />
              Verified
            </span>
          )}
          {isCentre && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              <ShieldCheck className="h-3 w-3" />
              Scoped Examiner
            </span>
          )}
        </div>

        <h2 className="mt-3 text-lg font-bold text-navy">{name}</h2>
        <p className="text-sm text-muted">
          {isCentre && centerName
            ? `Centre Examiner · ${title.replace(/^IELTS Examiner · /, "")}`
            : title}
        </p>
        <div className="mt-2">
          <StarRating rating={rating} reviewCount={reviewCount} />
        </div>

        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" />
            {email}
          </li>
          {memberSince ? (
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              {isCentre && centerName
                ? `Joined ${centerName} · ${memberSince}`
                : `Member since ${memberSince}`}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
