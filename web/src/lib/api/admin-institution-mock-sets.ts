import { apiFetch } from "./client";

export type AdminInstitutionMockSet = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isActive: boolean;
  grantCount: number;
  contentSummary: string;
  contentLocked: boolean;
  updatedAt: string;
};

export type AdminInstitutionMockSetDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isActive: boolean;
  packageIds: string[];
  grantCount: number;
  contentLocked: boolean;
};

export type MockSetContentOptionPackage = {
  id: string;
  title: string;
  packageKind: string;
  mockNumber: number;
  mockLabel: string;
  isAssigned: boolean;
  assignedSetId: string | null;
  assignedSetTitle: string | null;
};

export type MockSetContentOptionTest = {
  id: string;
  code: string;
  title: string;
  type: string;
  isAssigned: boolean;
  assignedSetId: string | null;
  assignedSetTitle: string | null;
  assignedPackageId: string | null;
  assignedPackageTitle: string | null;
};

export type MockSetContentOptions = {
  packages: {
    listening: MockSetContentOptionPackage[];
    reading: MockSetContentOptionPackage[];
    writing: MockSetContentOptionPackage[];
  };
  tests: {
    listening: MockSetContentOptionTest[];
    reading: MockSetContentOptionTest[];
    writing: MockSetContentOptionTest[];
  };
};

export type InstitutionMockSetGrant = {
  id: string;
  setId: string;
  setTitle: string;
  setSlug: string;
  setActive: boolean;
  contentSummary: string;
  note: string | null;
  createdAt: string;
};

export type GrantableMockSet = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  contentSummary: string;
};

export function getAdminInstitutionMockSets() {
  return apiFetch<AdminInstitutionMockSet[]>("/admin/institution-mock-sets");
}

export function getAdminInstitutionMockSet(id: string) {
  return apiFetch<AdminInstitutionMockSetDetail>(
    `/admin/institution-mock-sets/${id}`,
  );
}

export function getInstitutionMockSetContentOptions(excludeSetId?: string) {
  const q = excludeSetId
    ? `?excludeSetId=${encodeURIComponent(excludeSetId)}`
    : "";
  return apiFetch<MockSetContentOptions>(
    `/admin/institution-mock-sets/content-options${q}`,
  );
}

export function createInstitutionMockSet(body: {
  slug: string;
  title: string;
  description?: string;
  isActive?: boolean;
  packageIds?: string[];
  listeningIds?: string[];
  readingIds?: string[];
  writingIds?: string[];
}) {
  return apiFetch<AdminInstitutionMockSetDetail>("/admin/institution-mock-sets", {
    method: "POST",
    body,
  });
}

export function updateInstitutionMockSet(
  id: string,
  body: {
    slug?: string;
    title?: string;
    description?: string | null;
    isActive?: boolean;
    packageIds?: string[];
    listeningIds?: string[];
    readingIds?: string[];
    writingIds?: string[];
  },
) {
  return apiFetch<AdminInstitutionMockSetDetail>(
    `/admin/institution-mock-sets/${id}`,
    { method: "PATCH", body },
  );
}

export function getInstitutionMockSetGrants(institutionId: string) {
  return apiFetch<InstitutionMockSetGrant[]>(
    `/admin/institutions/${institutionId}/mock-set-grants`,
  );
}

export function getGrantableInstitutionMockSets(institutionId: string) {
  return apiFetch<GrantableMockSet[]>(
    `/admin/institutions/${institutionId}/mock-set-grants/available`,
  );
}

export function grantInstitutionMockSet(
  institutionId: string,
  setId: string,
  note?: string,
) {
  return apiFetch<InstitutionMockSetGrant[]>(
    `/admin/institutions/${institutionId}/mock-set-grants`,
    { method: "POST", body: { setId, note } },
  );
}

export function revokeInstitutionMockSetGrant(
  institutionId: string,
  setId: string,
) {
  return apiFetch<InstitutionMockSetGrant[]>(
    `/admin/institutions/${institutionId}/mock-set-grants/${setId}`,
    { method: "DELETE" },
  );
}
