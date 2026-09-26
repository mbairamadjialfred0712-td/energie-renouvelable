import type { ReactNode } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border bg-background px-5 py-6 sm:px-8 lg:px-10">
    <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h1 className="mt-2 truncate text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action}
  </header>;
}
export function EmptyState({ title, description, actionLabel = "Ajouter les premières données", onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="border border-dashed border-border bg-background px-6 py-14 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-muted text-muted-foreground"><AlertCircle /></div><h2 className="mt-4 text-base font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>{onAction && <Button className="mt-5" onClick={onAction}><Plus />{actionLabel}</Button>}</div>;
}
export function WorkspacePage({ eyebrow, title, description, children, action }: { eyebrow: string; title: string; description: string; children: ReactNode; action?: ReactNode }) {
  return <div className="min-h-screen"><PageHeader eyebrow={eyebrow} title={title} description={description} action={action} /><div className="p-5 sm:p-8 lg:p-10">{children}</div></div>;
}
