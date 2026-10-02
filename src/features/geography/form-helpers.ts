import type { FormValues } from "./entity-manager";

export const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));
export const bool = (value: string | undefined) => (value === "true" ? true : value === "false" ? false : null);
export const nullable = (value: string | undefined) => (value && value.length > 0 ? value : null);
export const pick = (form: FormValues, keys: string[]) => Object.fromEntries(keys.map((key) => [key, form[key] ?? ""]));
export const metaFor = (title: string, description: string) => ({
  meta: [
    { title: `${title} — Énergie Renouvelable` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Énergie Renouvelable` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
