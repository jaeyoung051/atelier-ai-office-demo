import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialize} from '../db.ts';
import {seedDemoPortfolios,listPortfolios,generatePortfolio,createPortfolio} from '../portfolios.ts';
import {readSettings,saveSettings} from '../settings.ts';
import {decideTask} from '../tasks.ts';
test('demo portfolio seed, case prompt and source preservation, approval',async()=>{
 const db=initialize(':memory:');try{seedDemoPortfolios(db);seedDemoPortfolios(db);assert.equal(listPortfolios(db).length,2);assert.equal(db.prepare('SELECT count(*) n FROM media_files').get()!.n,2);const settings=readSettings(db);settings.roles.design.provider='Gemini';saveSettings(db,settings);
 const task=await generatePortfolio(db,'demo-wood31',{id:'portfolio-test'},{env:{GEMINI_API_KEY:'test-key'},generate:async(system,input)=>{assert.match(input,/Instagram/);assert.match(input,/블로그/);assert.match(input,/Threads/);assert.match(input,/가상 오크/);assert.match(input,/가상 사례·게시용 아님/);return '[Instagram]\n가상 초안\n[블로그]\n가상 원고\n[Threads]\n가상 초안';}});
 assert.equal(task.portfolio_id,'demo-wood31');assert.equal(task.status,'review');assert.equal(decideTask(db,String(task.id),{decision:'approved',result_version:1,comment:'테스트 승인'}).status,'approved');
 const snapshot=db.prepare('SELECT portfolio_snapshot FROM tasks WHERE id=?').get(task.id)!.portfolio_snapshot;db.exec("UPDATE portfolios SET summary='수정됨' WHERE id='demo-wood31'");assert.equal(db.prepare('SELECT portfolio_snapshot FROM tasks WHERE id=?').get(task.id)!.portfolio_snapshot,snapshot);
 const p=createPortfolio(db,{name:'가상 직접 등록',note:'가상',spec:'가상 타일',area:24,tags:['욕실']});assert.ok(p?.id);assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.close();}
});
