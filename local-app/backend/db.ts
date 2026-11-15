import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync, chmodSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
export const root = fileURLToPath(new URL('../', import.meta.url));
const localConfigPath=resolve(root,'local-data.json');
const localData=existsSync(localConfigPath)?JSON.parse(readFileSync(localConfigPath,'utf8')):{};
export const defaultPath = resolve(process.env.PIXFFICE_DB_PATH || resolve(root,localData.databasePath||'data/pixffice.sqlite'));
export function transaction<T>(db: DatabaseSync, fn:()=>T):T {
 db.exec('BEGIN IMMEDIATE'); try { const value=fn(); db.exec('COMMIT'); return value; } catch(e){db.exec('ROLLBACK');throw e;}
}
export function openDatabase(path=defaultPath) {
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path); if(path!==':memory:')chmodSync(path,0o600);
 db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;');
 return db;
}
export function migrate(db:DatabaseSync, directory=resolve(root,'backend/migrations')) {
 db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, checksum TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))) STRICT");
 for(const version of readdirSync(directory).filter(f=>f.endsWith('.sql')).sort()){
 const sql=readFileSync(resolve(directory,version),'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
 transaction(db,()=>{const prior=db.prepare('SELECT checksum FROM schema_migrations WHERE version=?').get(version);if(prior){if(prior.checksum!==checksum)throw Error('Migration checksum mismatch: '+version);return;}db.exec(sql);db.prepare('INSERT INTO schema_migrations(version,checksum) VALUES (?,?)').run(version,checksum);});
 }
}
export const roleFields=['goal','responsibilities','inputs','procedure','outputs','review','cautions','approval_conditions'] as const;
export function seed(db:DatabaseSync){transaction(db,()=>{
 const names=['AI 운영실장','고객관리팀장','현장관리팀장','디자인·마케팅팀장']; const codes=['director','customer','field','design'];
 codes.forEach((id,i)=>{db.prepare("INSERT INTO ai_employees(id,code,name,provider) VALUES (?,?,?,'mock') ON CONFLICT(code) DO NOTHING").run(id,id,names[i]);
 const employee=db.prepare('SELECT id FROM ai_employees WHERE code=?').get(id)!;
 if(!db.prepare('SELECT 1 FROM role_instructions WHERE employee_id=?').get(employee.id))db.prepare(`INSERT INTO role_instructions(id,employee_id,version,${roleFields.join(',')}) VALUES (?,?,1,?,?,?,?,?,?,?,?)`).run('seed-role-'+id,employee.id,'[더미] 확인된 자료로 초안 작성',names[i]+' 담당 업무','사용자가 제공한 가상 자료','자료 확인 → 초안 → 검토 → 승인 요청','요약과 미확인 사항','출처·금액·일정·개인정보 확인','추측 및 승인 없는 외부 실행 금지','발송·발주·게시 전 사용자 승인');});
 const categories=['customer','estimate_material','process_order','sns_portfolio','proposal','security'];const titles=['고객응대','견적/자재','공정/발주','SNS/포트폴리오','제안서','보안'];
 categories.forEach((c,i)=>{if(!db.prepare('SELECT 1 FROM business_rules WHERE rule_key=?').get(c))db.prepare('INSERT INTO business_rules(id,rule_key,category,title,body,version) VALUES (?,?,?,?,?,1)').run('seed-rule-'+c,c,c,titles[i],'[더미 예시·공식 규정 아님] 확인된 자료만 사용하고 개인정보를 최소화합니다. 고객 발송·발주·외부 공개는 사용자 승인 후 진행합니다.');});
 });}
export function initialize(path=defaultPath){const db=openDatabase(path);try{migrate(db);seed(db);return db;}catch(e){db.close();throw e;}}
export async function backupDatabase(db:DatabaseSync,destination:string){mkdirSync(dirname(destination),{recursive:true,mode:0o700});await backup(db,destination);chmodSync(destination,0o600);const check=new DatabaseSync(destination,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok'||check.prepare('PRAGMA foreign_key_check').all().length)throw Error('Backup verification failed');}finally{check.close();}}
export function appendRole(db:DatabaseSync,employee:string,expected:number,body:Record<string,unknown>){return transaction(db,()=>{
 const latest=db.prepare('SELECT version FROM role_instructions WHERE employee_id=? ORDER BY version DESC LIMIT 1').get(employee);if(Number(latest?.version||0)!==expected)throw Error('VERSION_CONFLICT');
 const values=roleFields.map(k=>{const v=body[k];if(typeof v!=='string'||!v.trim()||v.length>8000)throw Error('INVALID_FIELDS');return v;});
 const id=randomUUID();db.prepare(`INSERT INTO role_instructions(id,employee_id,version,${roleFields.join(',')}) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id,employee,expected+1,...values);return db.prepare('SELECT * FROM role_instructions WHERE id=?').get(id);
 });}
export function appendRule(db:DatabaseSync,key:string,expected:number,body:Record<string,unknown>){return transaction(db,()=>{
 const prior=db.prepare('SELECT * FROM business_rules WHERE rule_key=? ORDER BY version DESC LIMIT 1').get(key);if(Number(prior?.version||0)!==expected)throw Error('VERSION_CONFLICT');
 for(const k of ['title','body','category'])if(typeof body[k]!=='string'||!String(body[k]).trim()||String(body[k]).length>16000)throw Error('INVALID_FIELDS');
 if(body.archived!==undefined&&body.archived!==0&&body.archived!==1)throw Error('INVALID_FIELDS');
 const id=randomUUID();db.prepare('INSERT INTO business_rules(id,rule_key,category,title,body,version,archived) VALUES (?,?,?,?,?,?,?)').run(id,key,String(body.category),String(body.title),String(body.body),expected+1,Number(body.archived||0));return db.prepare('SELECT * FROM business_rules WHERE id=?').get(id);
 });}
