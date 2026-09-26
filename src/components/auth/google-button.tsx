import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
export function GoogleButton() {
  const [error, setError] = useState("");
  const signIn = async () => { setError(""); sessionStorage.setItem("auth-return", "/dashboard"); const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) setError("La connexion Google n’a pas abouti."); else if (!result.redirected) window.location.assign("/dashboard"); };
  return <div><Button type="button" variant="outline" className="w-full" onClick={signIn}><span className="text-base font-bold">G</span>Continuer avec Google</Button>{error && <p className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}
