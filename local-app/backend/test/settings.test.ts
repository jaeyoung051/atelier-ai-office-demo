import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialize} from '../db.ts';
import {readSettings,saveSettings} from '../settings.ts';
test('UI settings roundtrip, no-op, stale conflict, all-or-nothing rollback',()=>{
 const db=initialize(':memory:');try{
 const first=readSettings(db);const draft=structuredClone(first);draft.roles.director.fields[0]='가상 담당 수정';draft.roles.director.provider='Claude';draft.standards[0].description='기준 설명 수정';draft.standards[0].example='가상 예시 수정';
 const saved=saveSettings(db,draft);assert.equal(saved.roles.director.revision,2);assert.equal(saved.standards[0].revision,2);assert.deepEqual(readSettings(db),saved);
 assert.deepEqual(saveSettings(db,saved),saved);assert.throws(()=>saveSettings(db,first),/VERSION_CONFLICT/);
 const bad=structuredClone(saved);bad.roles.director.fields[0]='롤백할 수정';bad.standards[5].example='';assert.throws(()=>saveSettings(db,bad),/INVALID_FIELDS/);assert.deepEqual(readSettings(db),saved);
 }finally{db.close();}
});
