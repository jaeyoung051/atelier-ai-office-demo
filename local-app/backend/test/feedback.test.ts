import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initialize} from '../db.ts';
import {createProject,changeProjectStage,listProjects,listProposals,changeTaskKind} from '../projects.ts';
import {runTask,decideTask} from '../tasks.ts';
import {readSettings,saveSettings} from '../settings.ts';
test('customer stages persist with revision conflicts, proposal list only returns categorized work',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'feedback-')),path=join(dir,'test.sqlite');let db=initialize(path);try{
 let project=createProject(db,{name:'가상 현장',detail:'가상 상담',lifecycle_stage:'sales'})!;assert.equal(project.lifecycle_stage,'sales');
 project=changeProjectStage(db,String(project.id),{revision:1,lifecycle_stage:'contracted'})!;assert.equal(project.revision,2);assert.throws(()=>changeProjectStage(db,String(project.id),{revision:1,lifecycle_stage:'completed'}),/VERSION_CONFLICT/);
 project=changeProjectStage(db,String(project.id),{revision:2,lifecycle_stage:'construction'})!;assert.equal(project.status,'active');project=changeProjectStage(db,String(project.id),{revision:3,lifecycle_stage:'completed'})!;assert.equal(project.status,'completed');
 assert.throws(()=>changeProjectStage(db,String(project.id),{revision:4,lifecycle_stage:'invalid'}),/INVALID_FIELDS/);
 const settings=readSettings(db);settings.roles.design.provider='Gemini';saveSettings(db,settings);
 const task=await runTask(db,{id:'proposal-feedback',employee_id:'design',project_id:project.id,input:'가상 주방 제안서 개요를 작성하세요.'},{env:{GEMINI_API_KEY:'test-key'},generate:async()=> '[가상 원고] 제안서 초안'});assert.equal(task.kind,'proposal');
 const list=listProposals(db);assert.equal(list.length,1);assert.equal(list[0].project_name,'가상 현장');assert.equal(list[0].status,'review');decideTask(db,'proposal-feedback',{decision:'approved',result_version:1,comment:'테스트 승인'});assert.equal(listProposals(db)[0].status,'approved');
 changeTaskKind(db,'proposal-feedback',{kind:'general',expected_kind:'proposal'});assert.equal(listProposals(db).length,0);changeTaskKind(db,'proposal-feedback',{kind:'proposal',expected_kind:'general'});assert.throws(()=>changeTaskKind(db,'proposal-feedback',{kind:'general',expected_kind:'general'}),/VERSION_CONFLICT/);
 db.close();db=initialize(path);assert.equal(listProjects(db)[0].lifecycle_stage,'completed');assert.equal(listProposals(db).length,1);assert.equal(listProposals(db)[0].result,'[가상 원고] 제안서 초안');assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});

test('upgrade keeps old projects and tasks while classifying stages and proposal work',async()=>{
 const {mkdtempSync,cpSync}=await import('node:fs');const {migrate,openDatabase,seed,root}=await import('../db.ts');const {seedDemoPortfolios}=await import('../portfolios.ts');
 const dir=mkdtempSync(join(tmpdir(),'feedback-migration-'));const {readdirSync,mkdirSync}=await import('node:fs');const old=join(dir,'old');mkdirSync(old);for(const file of readdirSync(join(root,'backend/migrations')).filter(f=>f<'007'))cpSync(join(root,'backend/migrations',file),join(old,file));
 const db=openDatabase(':memory:');try{migrate(db,old);seed(db);seedDemoPortfolios(db);db.exec("INSERT INTO projects(id,name,status) VALUES ('old-sale','가상 상담','planning'),('old-work','가상 공사','active'),('old-done','가상 완료','completed')");db.exec("INSERT INTO tasks(id,employee_id,title,input_text,status) VALUES ('old-proposal','design','고객 제안서 초안','기존 입력','pending')");db.exec("INSERT INTO tasks(id,employee_id,title,portfolio_id) VALUES ('old-marketing','design','제안서 관련 홍보','demo-wood31')");migrate(db);assert.equal(db.prepare("SELECT lifecycle_stage FROM projects WHERE id='old-work'").get()!.lifecycle_stage,'construction');assert.equal(db.prepare("SELECT lifecycle_stage FROM projects WHERE id='old-done'").get()!.lifecycle_stage,'completed');assert.equal(db.prepare("SELECT input_text,kind FROM tasks WHERE id='old-proposal'").get()!.input_text,'기존 입력');assert.equal(db.prepare("SELECT kind FROM tasks WHERE id='old-proposal'").get()!.kind,'proposal');assert.equal(db.prepare("SELECT kind FROM tasks WHERE id='old-marketing'").get()!.kind,'marketing');assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
