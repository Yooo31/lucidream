export const LICENSE_TYPES = ['FREE', 'MEDIUM', 'PRO'] as const;

export type LicenseType = (typeof LICENSE_TYPES)[number];
