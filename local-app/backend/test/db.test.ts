import { Readable } from 'node:stream';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initialize, seed, migrate, openDatabase, backupDatabase, appendRole, appendRule, roleFields } from '../db.ts';
import { makeServer } from '../server.ts';
test('DB lifecycle, constraints, CRUD, history, rollback, backup and process restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'pixffice-'));const path=join(dir,'test.sqlite');let db=initialize(path);
 try{
 assert.equal(db.prepare('SELECT count(*) n FROM ai_employees').get()!.n,4);
 assert.equal(db.prepare('SELECT count(*) n FROM business_rules').get()!.n,6);
 seed(db);migrate(db);assert.equal(db.prepare('SELECT count(*) n FROM business_rules').get()!.n,6);
 db.prepare("INSERT INTO projects(id,name) VALUES ('p','가상 테스트')").run();
 db.prepare("UPDATE projects SET name='수정' WHERE id='p'").run();assert.equal(db.prepare("SELECT name FROM projects WHERE id='p'").get()!.name,'수정');
 assert.throws(()=>db.prepare("INSERT INTO tasks(id,employee_id,title) VALUES ('bad','missing','x')").run(),/FOREIGN KEY/);
 assert.throws(()=>db.exec("INSERT INTO projects(id,name,status) VALUES ('bad','x','invalid')"),/CHECK/);
 assert.throws(()=>db.exec("INSERT INTO ai_employees(id,code,name,provider) VALUES ('x','director','x','mock')"),/UNIQUE/);
 assert.throws(()=>db.exec("INSERT INTO tasks(id,employee_id,role_instruction_id,title) VALUES ('bad','field','seed-role-director','x')"),/mismatch/);
 db.exec("INSERT INTO tasks(id,project_id,employee_id,title) VALUES ('t','p','director','가상 작업')");
 assert.throws(()=>db.exec("DELETE FROM projects WHERE id='p'"),/FOREIGN KEY/);
 assert.throws(()=>db.exec("UPDATE tasks SET status='approved' WHERE id='t'"),/approval/);
 db.exec("UPDATE tasks SET result='초안',result_version=1,status='review' WHERE id='t'");
 assert.throws(()=>db.exec("INSERT INTO approvals(id,task_id,result_version,result_snapshot,decision,reviewer) VALUES ('bad','t',1,'다른 결과','approved','테스터')"),/match/);
 db.exec("INSERT INTO approvals(id,task_id,result_version,result_snapshot,decision,reviewer) VALUES ('a','t',1,'초안','rejected','테스터')");
 assert.equal(db.prepare("SELECT status FROM tasks WHERE id='t'").get()!.status,'rejected');
 assert.throws(()=>db.exec("UPDATE approvals SET decision='approved' WHERE id='a'"),/append-only/);
 db.exec("UPDATE tasks SET result='수정안',result_version=2,status='review' WHERE id='t'");
 db.exec("INSERT INTO approvals(id,task_id,result_version,result_snapshot,decision,reviewer) VALUES ('a2','t',2,'수정안','approved','테스터')");
 const role=Object.fromEntries(roleFields.map(k=>[k,'수정된 더미']));appendRole(db,'director',1,role);assert.throws(()=>appendRole(db,'director',1,role),/VERSION_CONFLICT/);
 appendRule(db,'security',1,{title:'보안 수정',body:'가상 기준',category:'security'});seed(db);assert.equal(db.prepare("SELECT count(*) n FROM business_rules WHERE rule_key='security'").get()!.n,2);
 db.exec("INSERT INTO projects(id,name) VALUES ('delete','CRUD 삭제')");db.exec("DELETE FROM projects WHERE id='delete'");assert.equal(db.prepare("SELECT * FROM projects WHERE id='delete'").get(),undefined);
 assert.equal(db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 await backupDatabase(db,join(dir,'backup.sqlite'));const restored=openDatabase(join(dir,'backup.sqlite'));assert.equal(restored.prepare('SELECT count(*) n FROM approvals').get()!.n,2);restored.close();
 const migrationDir=join(dir,'migrations'); const {mkdirSync}=await import('node:fs');mkdirSync(migrationDir);writeFileSync(join(migrationDir,'999_bad.sql'),'CREATE TABLE rollback_test(id TEXT); INVALID SQL;');assert.throws(()=>migrate(db,migrationDir));assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='rollback_test'").get(),undefined);
 db.close();const restart=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',"import {initialize} from './backend/db.ts';const db=initialize();if(db.prepare(\"SELECT name FROM projects WHERE id='p'\").get().name!=='수정')process.exit(1);db.close();"],{cwd:new URL('../../',import.meta.url),env:{...process.env,PIXFFICE_DB_PATH:path},encoding:'utf8'});assert.equal(restart.status,0,restart.stderr);db=initialize(path);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('HTTP API read, append, conflict, validation, cross-origin rejection',async()=>{
 const db=initialize(':memory:');const server=makeServer(db);const base='http://127.0.0.1:4310';
 const fetch=async(url:string,options:any={})=>new Promise<any>((resolve,reject)=>{
 const req=Readable.from(options.body?[Buffer.from(options.body)]:[]) as any;req.method=options.method||'GET';req.url=new URL(url).pathname;req.headers={host:'127.0.0.1:4310',...Object.fromEntries(Object.entries(options.headers||{}).map(([k,v])=>[k.toLowerCase(),v]))};
 let status=200;const res={writeHead:(s:number)=>{status=s;},end:(body:string)=>resolve({status,json:async()=>JSON.parse(body)})};
 server.emit('request',req,res);
 });
 try{assert.equal((await (await fetch(base+'/api/employees')).json()).length,4);assert.equal((await (await fetch(base+'/api/rules')).json()).length,6);
 const post=(path:string,data:unknown,extra={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(data)});
 const body={expected_version:1,...Object.fromEntries(roleFields.map(k=>[k,'API 가상 수정']))};assert.equal((await post('/api/employees/director/roles',body)).status,201);assert.equal((await post('/api/employees/director/roles',body)).status,409);
 assert.equal((await post('/api/rules/new_test',{expected_version:0,category:'security',title:'테스트',body:'가상 기준'})).status,201);
 assert.equal((await post('/api/rules/new_test',{expected_version:1,category:'security',title:'테스트',body:'가상 기준',archived:1})).status,201);
 assert.equal((await post('/api/rules/bad',{expected_version:0,category:'invalid',title:'x',body:'x'})).status,400);
 assert.equal((await post('/api/employees/director/roles',body,{Origin:'https://public-demo.example'})).status,403);
 assert.equal((await (await fetch(base+'/api/employees/director/roles')).json()).length,2);
 }finally{db.close();}
});
