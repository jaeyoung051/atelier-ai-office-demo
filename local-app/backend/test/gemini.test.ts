import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateGemini,geminiStatus} from '../gemini.ts';
import {initialize} from '../db.ts';
import {readSettings,saveSettings} from '../settings.ts';
import {runTask,decideTask} from '../tasks.ts';
const env={GEMINI_API_KEY:'test-only-not-real',PIXFFICE_PROVIDER:'Gemini'};
test('Gemini request, output and quota failure without retries',async()=>{
 let calls=0;
 const fetcher=async(url:any,options:any)=>{calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.ok(!url.includes(env.GEMINI_API_KEY));assert.equal(options.headers['x-goog-api-key'],env.GEMINI_API_KEY);const body=JSON.parse(options.body);assert.equal(body.systemInstruction.parts[0].text,'역할');assert.equal(body.contents[0].parts[0].text,'업무');assert.equal(body.tools,undefined);return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'가상 초안'}]}}]}));};
 assert.equal(await generateGemini('역할','업무',{env,fetcher:fetcher as typeof fetch}),'가상 초안');assert.equal(calls,1);
 let retries=0;await assert.rejects(generateGemini('x','x',{env,fetcher:(async()=>{retries++;return new Response('sensitive',{status:429});}) as typeof fetch}),/GEMINI_RATE_LIMIT/);assert.equal(retries,1);
 await assert.rejects(generateGemini('x','x',{env,fetcher:(async()=>new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS'}]}))) as typeof fetch}),/GEMINI_INCOMPLETE/);
 assert.equal(geminiStatus({}).ready,false);
});
test('Gemini result persists with provider/model and supports approval',async()=>{
 const db=initialize(':memory:');try{const settings=readSettings(db);settings.roles.design.provider='Gemini';saveSettings(db,settings);
 await assert.rejects(runTask(db,{id:'nokey',input:'가상 SNS 원고',employee_id:'design'},{env:{}}),/GEMINI_NOT_CONFIGURED/);
 const task=await runTask(db,{id:'gemini-test',input:'가상 SNS 원고',employee_id:'design'},{env,generate:async()=> '테스트 응답'});
 assert.equal(task.provider,'Gemini');assert.equal(task.model,'gemini-3.5-flash-lite');assert.equal(task.status,'review');assert.equal(decideTask(db,'gemini-test',{decision:'approved',result_version:1,comment:''}).status,'approved');
 }finally{db.close();}
});
