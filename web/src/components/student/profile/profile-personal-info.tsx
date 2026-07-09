"use client";

import { useState } from "react";
import {
  Check,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
  X,
} from "lucide-react";
import { useStudentProfileData } from "@/contexts/student-profile-context";
import { useToast } from "@/components/ui/toast";

const fields = [
  { key: "fullName", label: "Full Name", icon: User, editable: true },
  { key: "email", label: "Email Address", icon: Mail, editable: false },
  { key: "phone", label: "Phone Number", icon: Phone, editable: true },
  { key: "cityCountry", label: "City / Country", icon: MapPin, editable: true },
] as const;

type FieldKey = (typeof fields)[number]["key"];

const TARGET_BANDS = ["6", "6.5", "7", "7.5", "8", "8.5", "9"];

export function ProfilePersonalInfo() {
  const { profile, update } = useStudentProfileData();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const personal = profile?.personal;
  const [draft, setDraft] = useState<Record<FieldKey, string>>({
    fullName: "",
    email: "",
    phone: "",
    cityCountry: "",
  });
  const [targetBand, setTargetBand] = useState("");
  const [examType, setExamType] = useState<"academic" | "general_training">(
    "academic",
  );

  if (!profile || !personal) return null;

  const personalValues = {
    fullName: personal.fullName,
    email: personal.email,
    phone: personal.phone,
    cityCountry: personal.cityCountry,
  };

  function startEdit() {
    if (!profile) return;
    setDraft(personalValues);
    setTargetBand(profile.targetBand != null ? String(profile.targetBand) : "");
    setExamType(profile.examType);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
  }
  async function save() {
    setSaving(true);
    try {
      await update({
        name: draft.fullName.trim(),
        phone: draft.phone.trim(),
        country: draft.cityCountry.trim(),
        examType,
        ...(targetBand ? { targetBand: Number(targetBand) } : {}),
      });
      setEditing(false);
      toast("Personal information updated", { variant: "success" });
    } catch {
      toast("Could not update profile", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
            Personal Information
          </h3>
          <p className="mt-0.5 text-gray-500" style={{ fontSize: "13px" }}>
            Your identity details as registered on this platform
          </p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50"
              style={{ fontSize: "13px" }}
            >
              <X size={14} />
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-3 py-1.5 font-semibold text-white hover:bg-[#243660] disabled:opacity-60"
              style={{ fontSize: "13px" }}
            >
              <Check size={14} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
            style={{ fontSize: "13px" }}
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const Icon = field.icon;
          return (
            <div
              key={field.key}
              className="rounded-xl border border-gray-100 p-4"
            >
              <div className="mb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-gray-400" style={{ fontSize: "10px" }}>
                <Icon size={12} />
                {field.label}
              </div>
              {editing && field.editable ? (
                <input
                  type="text"
                  value={draft[field.key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-200 px-2 py-1 font-semibold text-gray-900 outline-none focus:border-[#1B2A4A]"
                  style={{ fontSize: "14px" }}
                />
              ) : (
                <p className="font-semibold text-gray-900" style={{ fontSize: "14px" }}>
                  {personalValues[field.key]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="mb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-gray-400" style={{ fontSize: "10px" }}>
            Target Band
          </div>
          {editing ? (
            <select
              value={targetBand}
              onChange={(e) => setTargetBand(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-2 py-1 font-semibold text-gray-900 outline-none focus:border-[#1B2A4A]"
              style={{ fontSize: "14px" }}
            >
              <option value="">Not set</option>
              {TARGET_BANDS.map((band) => (
                <option key={band} value={band}>
                  Band {band}
                </option>
              ))}
            </select>
          ) : (
            <p className="font-semibold text-gray-900" style={{ fontSize: "14px" }}>
              {profile.targetBand != null ? `Band ${profile.targetBand}` : "Not set"}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="mb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-gray-400" style={{ fontSize: "10px" }}>
            Exam Type
          </div>
          {editing ? (
            <select
              value={examType}
              onChange={(e) =>
                setExamType(e.target.value as "academic" | "general_training")
              }
              className="w-full rounded-md border border-gray-200 px-2 py-1 font-semibold text-gray-900 outline-none focus:border-[#1B2A4A]"
              style={{ fontSize: "14px" }}
            >
              <option value="academic">Academic</option>
              <option value="general_training">General Training</option>
            </select>
          ) : (
            <p className="font-semibold text-gray-900" style={{ fontSize: "14px" }}>
              {profile.examType === "general_training"
                ? "General Training"
                : "Academic"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
