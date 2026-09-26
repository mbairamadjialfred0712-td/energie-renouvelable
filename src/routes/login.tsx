import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/account.functions";
import { AuthLayout } from "@/components/auth/auth-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({ head: () => ({ meta: [{ title: "Connexion — Énergie Renouvelable" },{ name:"description",content:"Connectez-vous à votre espace d’étude énergétique."},{property:"og:title",content:"Connexion — Énergie Renouvelable"},{property:"og:description",content:"Accès sécurisé à la plateforme d’ingénierie énergétique."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}] }), component: LoginPage });
function LoginPage(){ const navigate=useNavigate(); const ensure=useServerFn(ensureProfile); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 const submit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();setBusy(true);setError("");const fd=new FormData(e.currentTarget);const email=String(fd.get("email"));const password=String(fd.get("password"));const {data,error:authError}=await supabase.auth.signInWithPassword({email,password});if(authError||!data.user){setError("Adresse e-mail ou mot de passe incorrect.");setBusy(false);return;}const meta=data.user.user_metadata;await ensure({data:{displayName:String(meta?.["display_name"]||email.split("@")[0])}});navigate({to:"/dashboard",replace:true});};
 return <AuthLayout title="Connexion" description="Retrouvez vos territoires, hypothèses et études dans un espace privé."><form className="space-y-4" onSubmit={submit}><div className="grid gap-1.5"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div><div className="grid gap-1.5"><div className="flex justify-between"><Label htmlFor="password">Mot de passe</Label><Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Mot de passe oublié ?</Link></div><Input id="password" name="password" type="password" required autoComplete="current-password" /></div>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={busy}>{busy?"Connexion…":"Se connecter"}</Button></form><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>ou<span className="h-px flex-1 bg-border"/></div><GoogleButton/><p className="mt-6 text-center text-sm text-muted-foreground">Pas encore de compte ? <Link to="/register" className="font-semibold text-primary hover:underline">Créer un compte</Link></p></AuthLayout> }
