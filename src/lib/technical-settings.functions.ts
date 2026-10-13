import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTechnicalSettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [settings, roles] = await Promise.all([context.supabase.from("technical_settings").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }), context.supabase.from("user_roles").select("role").eq("user_id", context.userId)]);
  if (settings.error || roles.error) throw new Error("Les paramètres n’ont pas pu être chargés.");
  return { settings: settings.data ?? [], isAdmin: roles.data?.some(r => r.role === "admin") ?? false };
});
export const saveTechnicalSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ technology: z.enum(["solar", "wind", "biomass"]), efficiency: z.number().finite().positive().max(1), conversion_efficiency: z.number().finite().positive().max(1), lifetime_years: z.number().int().min(1).max(100), justification: z.string().trim().min(10).max(4000) }).parse(input)).handler(async ({ data, context }) => {
  const { data: saved, error } = await context.supabase.from("technical_settings").insert({ ...data, created_by: context.userId }).select("id").single();
  if (error) throw new Error("Enregistrement refusé : paramètres valides et rôle administrateur requis.");
  return saved;
});
export const listTesters = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: roles, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  if (error || !roles?.some(r => r.role === "admin")) throw new Error("Cette page est réservée aux administrateurs.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [profiles, allRoles, history] = await Promise.all([supabaseAdmin.from("profiles").select("id,display_name,organization,created_at").order("created_at", { ascending: false }), supabaseAdmin.from("user_roles").select("user_id,role"), context.supabase.from("role_change_history").select("*").order("created_at", { ascending: false }).limit(20)]);
  if (profiles.error || allRoles.error || history.error) throw new Error("Les comptes n’ont pas pu être chargés.");
  return { users: (profiles.data ?? []).map(p => ({ ...p, roles: (allRoles.data ?? []).filter(r => r.user_id === p.id).map(r => r.role) })), history: history.data ?? [], currentUserId: context.userId };
});
export const setTesterEngineer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ targetId: z.string().uuid(), enabled: z.boolean() }).parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("set_tester_engineer", { _target_id: data.targetId, _enabled: data.enabled });
  if (error) throw new Error(error.message);
  return { ok: true };
});
