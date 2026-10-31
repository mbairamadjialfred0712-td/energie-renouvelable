import { type InventoryFilter } from "./inventory";
export function CatalogControls({ filter, localities, onChange }: { filter: InventoryFilter; localities: [string, string][]; onChange: (filter: InventoryFilter) => void }) {
  return <div className="mb-5 flex flex-wrap gap-3">
    <select aria-label="Filtrer par localité" className="h-9 max-w-full border border-input bg-background px-3 text-sm" value={filter.locality ?? ""} onChange={e => onChange({ ...filter, locality: e.target.value || undefined })}><option value="">Toutes localités</option>{localities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
    <select aria-label="Filtrer par statut" className="h-9 border border-input bg-background px-3 text-sm" value={filter.status ?? ""} onChange={e => onChange({ ...filter, status: e.target.value || undefined })}><option value="">Tous statuts</option><option value="validated">Validée</option><option value="unverified">Non vérifiée</option><option value="in_review">En vérification</option><option value="rejected">Rejetée</option><option value="archived">Archivée</option></select>
  </div>;
}