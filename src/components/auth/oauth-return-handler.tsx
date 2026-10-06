import { useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/account.functions";

const SAFE_PATH = /^\/(?!\/)[\w\-./]*$/;

/**
 * Finalise le retour d'une connexion Google : lit les jetons présents dans l'URL,
 * ouvre la session, nettoie l'adresse puis redirige vers la destination enregistrée.
 * Écoute aussi les changements d'identité pour rafraîchir les données.
 */
export function OAuthReturnHandler() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ensure = useServerFn(ensureProfile);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const hasError = params.get("error_description") || params.get("error");

    if (accessToken && refreshToken) {
      (async () => {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error || !data.user) { navigate({ to: "/login", replace: true }); return; }
        const meta = data.user.user_metadata ?? {};
        const displayName = String(meta["full_name"] || meta["name"] || meta["display_name"] || data.user.email?.split("@")[0] || "Utilisateur");
        try { await ensure({ data: { displayName } }); } catch (e) { console.error("ensureProfile failed", e); }
        const stored = sessionStorage.getItem("auth-return");
        sessionStorage.removeItem("auth-return");
        const target = stored && SAFE_PATH.test(stored) ? stored : "/dashboard";
        navigate({ to: target as "/dashboard", replace: true });
      })();
    } else if (hasError) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      navigate({ to: "/login", replace: true });
    }
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
