import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(160).optional(),
  jobTitle: z.string().trim().max(120).optional(),
});

export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      display_name: data.displayName,
      organization: data.organization || null,
      job_title: data.jobTitle || null,
    });
    if (profileError) throw new Error("Le profil n’a pas pu être initialisé.");
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "viewer" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error("Le rôle par défaut n’a pas pu être attribué.");
    return { ok: true };
  });
