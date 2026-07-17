export type InstitutionSettingsTab = "profile" | "public";

export const institutionSettingsTabs: {
  id: InstitutionSettingsTab;
  label: string;
  description: string;
}[] = [
  {
    id: "profile",
    label: "Center Profile",
    description: "Logo, contact & location",
  },
  {
    id: "public",
    label: "Public Page",
    description: "Sign-up links & status",
  },
];

export type InstitutionProfileForm = {
  name: string;
  city: string;
  address: string;
  bio: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

export function profileFormFromData(data: {
  name: string;
  city: string | null;
  address: string | null;
  bio: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
}): InstitutionProfileForm {
  return {
    name: data.name,
    city: data.city ?? "",
    address: data.address ?? "",
    bio: data.bio ?? "",
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone ?? "",
  };
}

export function countUnsavedChanges(
  form: InstitutionProfileForm,
  saved: InstitutionProfileForm,
): number {
  return (Object.keys(form) as (keyof InstitutionProfileForm)[]).filter(
    (key) => form[key] !== saved[key],
  ).length;
}
