import {expect,it} from 'vitest';
import {snapshotForSave} from './snapshot-policy';
import {buildConfigSnapshot,type Sheet} from './battery-model';
const sheet:Sheet={name:'Arithmetic test',manufacturer:'Test',chemistry:'lfp',source:'Test only',status:'unverified',energy_kwh:5};
it('same-sheet ordinary save preserves snapshot and date despite catalogue edits',()=>{const snapshot=buildConfigSnapshot(sheet,'id','old');const out=snapshotForSave({datasheet_id:'id',snapshot,snapshot_at:'old'},{...sheet,energy_kwh:99},'id','new');expect(out.snapshot?.sheet.energy_kwh).toBe(5);expect(out.snapshot_at).toBe('old');});
it('legacy null stays null on ordinary save, no invented historical snapshot',()=>expect(snapshotForSave({datasheet_id:'id',snapshot:null,snapshot_at:null},sheet,'id','new')).toEqual({snapshot:null,snapshot_at:null}));
it('changed datasheet receives a new documented snapshot',()=>{const out=snapshotForSave({datasheet_id:'old',snapshot:null,snapshot_at:null},sheet,'new','now');expect(out.snapshot?.meta.datasheet_id).toBe('new');expect(out.snapshot_at).toBe('now');});
