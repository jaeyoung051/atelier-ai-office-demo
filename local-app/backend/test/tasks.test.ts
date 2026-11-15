import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialize} from '../db.ts';
import {readSettings,saveSettings} from '../settings.ts';
import {runTask,decideTask,listTasks} from '../tasks.ts';
import {generateClaude} from '../claude.ts';
const env={PIXFFICE_PROVIDER:'Claude',ANTHROPIC_API_KEY:'test-only-not-a-real-key',PIXFFICE_CLAUDE_MODEL:'test-model'};
test('Claude work snapshots, deduplication, approval, rejection, failure and no-key blocking',async()=>{
 const db=initialize(':memory:');try{
 const settings=readSettings(db);settings.roles.customer.provider='Claude';saveSettings(db,settings);
 const body={id:'test-task',input:'가상 고객 안내문',employee_id:'customer'};let calls=0;
 const generate=async(system:string,input:string)=>{calls++;assert.match(system,/고객관리팀장/);assert.match(system,/보안/);assert.equal(input,body.input);return '테스트 전용 가상 응답';};
 await assert.rejects(runTask(db,body,{env:{},generate}),/NOT_CONFIGURED/);assert.equal(listTasks(db).length,0);
 const t=await runTask(db,body,{env,generate});assert.equal(t.status,'review');assert.equal(t.result_version,1);assert.equal(db.prepare('SELECT count(*) n FROM task_business_rules').get()!.n,6);
 await runTask(db,body,{env,generate});assert.equal(calls,1);await assert.rejects(runTask(db,{...body,input:'변경'},{env,generate}),/VERSION_CONFLICT/);
 assert.throws(()=>decideTask(db,body.id,{decision:'approved',result_version:2,comment:''}),/VERSION_CONFLICT/);
 assert.equal(decideTask(db,body.id,{decision:'approved',result_version:1,comment:'테스트 승인'}).status,'approved');assert.throws(()=>decideTask(db,body.id,{decision:'rejected',result_version:1,comment:'늦은 반려'}),/VERSION_CONFLICT/);
 const rejected=await runTask(db,{...body,id:'rejected'},{env,generate});assert.equal(decideTask(db,'rejected',{decision:'rejected',result_version:1,comment:'가상 수정 요청'}).status,'rejected');
 const failed=await runTask(db,{...body,id:'failed'},{env,generate:async()=>{throw Error('SECRET-test-content');}});assert.equal(failed.status,'failed');assert.equal(failed.error_code,'CLAUDE_CONNECTION_FAILED');assert.ok(!JSON.stringify(failed).includes('SECRET'));
 assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.close();}
});
test('Claude adapter endpoint, auth headers, text, incomplete/error sanitization',async()=>{
 const fetcher=async(url:any,options:any)=>{assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(options.headers['x-api-key'],env.ANTHROPIC_API_KEY);const body=JSON.parse(options.body);assert.equal(body.model,'test-model');assert.equal(body.max_tokens,2048);return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:'가상 결과'}]}),{status:200});};
 assert.equal(await generateClaude('역할','업무',{env,fetcher:fetcher as typeof fetch}),'가상 결과');
 await assert.rejects(generateClaude('x','x',{env,fetcher:(async()=>new Response('secret',{status:401})) as typeof fetch}),/CLAUDE_AUTH_FAILED/);
 await assert.rejects(generateClaude('x','x',{env,fetcher:(async()=>new Response(JSON.stringify({stop_reason:'max_tokens',content:[]}))) as typeof fetch}),/INCOMPLETE/);
});
