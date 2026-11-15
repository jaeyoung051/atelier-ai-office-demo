import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './db.ts';
import { randomUUID } from 'node:crypto';
const ids=['director','customer','field','design'];
const categories=['customer','estimate_material','process_order','sns_portfolio','proposal','security'];
const fields=['responsibilities','goal','inputs','procedure','outputs','review','cautions','approval_conditions'];
export function readSettings(db:DatabaseSync){
 const roles=Object.fromEntries(ids.map(id=>{const r=db.prepare('SELECT * FROM role_instructions WHERE employee_id=? ORDER BY version DESC LIMIT 1').get(id)!;return [id,{fields:fields.map(f=>r[f]),provider:r.provider,legacy:r.legacy_prompt,revision:r.version}];}));
 const standards=categories.map(key=>{const r=db.prepare('SELECT * FROM business_rules WHERE rule_key=? ORDER BY version DESC LIMIT 1').get(key)!;return {title:r.title,description:r.description,example:r.body,revision:r.version};});
 return {version:2,roles,standards};
}
function text(v:unknown,max=8000){if(typeof v!=='string'||v.length>max)throw Error('INVALID_FIELDS');return v;}
export function saveSettings(db:DatabaseSync,value:any){
 if(!value||value.version!==2||!Array.isArray(value.standards)||value.standards.length!==6)throw Error('INVALID_FIELDS');
 return transaction(db,()=>{
 const current=readSettings(db);
 for(const id of ids){const v=value.roles?.[id],old=current.roles[id];
 if(!v||!Array.isArray(v.fields)||v.fields.length!==8||!['Claude','ChatGPT','Gemini','mock'].includes(v.provider))throw Error('INVALID_FIELDS');
 if(v.revision!==old.revision)throw Error('VERSION_CONFLICT');v.fields.forEach((s:unknown)=>text(s));text(v.legacy);
 if(JSON.stringify([v.fields,v.provider,v.legacy])===JSON.stringify([old.fields,old.provider,old.legacy]))continue;
 db.prepare(`INSERT INTO role_instructions(id,employee_id,version,${fields.join(',')},provider,legacy_prompt) VALUES (?,?,?,${fields.map(()=>'?').join(',')},?,?)`).run(randomUUID(),id,Number(old.revision)+1,...v.fields,v.provider,v.legacy);
 }
 value.standards.forEach((v:any,i:number)=>{const old=current.standards[i];if(!v||v.revision!==old.revision)throw Error('VERSION_CONFLICT');text(v.title);text(v.description);text(v.example);
 if(!v.title.trim()||!v.example.trim())throw Error('INVALID_FIELDS');
 if(JSON.stringify([v.title,v.description,v.example])===JSON.stringify([old.title,old.description,old.example]))return;
 db.prepare('INSERT INTO business_rules(id,rule_key,category,title,body,version,description) VALUES (?,?,?,?,?,?,?)').run(randomUUID(),categories[i],categories[i],v.title,v.example,Number(old.revision)+1,v.description);
 });return readSettings(db);
 });
}
