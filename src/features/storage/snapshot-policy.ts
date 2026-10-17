import {buildConfigSnapshot,type Sheet,type ConfigSnapshot} from './battery-model';
/** Ordinary edits keep same-sheet snapshots, including legacy nulls. Refresh is explicit elsewhere. */
export function snapshotForSave(existing:{datasheet_id:string;snapshot:ConfigSnapshot|null;snapshot_at:string|null}|null,sheet:Sheet,datasheetId:string,at:string){
 if(existing?.datasheet_id===datasheetId)return {snapshot:existing.snapshot,snapshot_at:existing.snapshot_at};
 const snapshot=buildConfigSnapshot(sheet,datasheetId,at);
 return {snapshot,snapshot_at:snapshot.meta.snapshot_at};
}
