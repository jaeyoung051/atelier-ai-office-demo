import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialize} from '../db.ts';
import {seedDemoPortfolios} from '../portfolios.ts';
import {splitPosts,reviewPost,updatePost,listPosts,exportPost} from '../posts.ts';
import {rewritePost} from '../rewrites.ts';
const env={GEMINI_API_KEY:'test-only-key'};
function fixture(){const db=initialize(':memory:');seedDemoPortfolios(db);db.prepare("INSERT INTO tasks(id,employee_id,title,portfolio_id,status,result,result_version,prompt_snapshot,input_text) VALUES ('rewrite-task','design','가상 검증','demo-wood31','review',?,1,'역할과 기준 고정본','가상 사례 입력')").run('[Instagram]\n[가상 사례] 기존 원고\n[블로그]\n[가상 사례] 사진 [사진 1] 원고\n[Threads]\n[가상 사례] 짧은 원고');return {db,post:splitPosts(db,'rewrite-task').find(p=>p.channel==='threads')!};}
test('rewrite rejected channel, keep source and metadata, fresh review, idempotency',async()=>{const {db,post}=fixture();try{
 await assert.rejects(rewritePost(db,String(post.id),{revision:1,request_id:'not-rejected'},{env,generate:async()=>''}),/REJECTION_REQUIRED/);
 reviewPost(db,String(post.id),{revision:1,decision:'rejected',comment:'두 문장으로 줄이고 가상 표시를 유지하세요.'});
 let calls=0;const generate=async(system:string,input:string)=>{calls++;assert.match(system,/역할과 기준 고정본/);assert.match(input,/두 문장으로/);assert.match(input,/가상 사례 입력/);return '[가상 사례] 수정된 원고. 두 번째 문장.';};
 const result=await rewritePost(db,String(post.id),{revision:1,request_id:'rewrite-ok'},{env,generate});assert.equal(result.run.status,'completed');const saved=result.posts.find(p=>p.id===post.id)!;assert.equal(saved.revision,2);assert.equal(saved.status,'review');assert.equal(saved.title,post.title);assert.deepEqual(saved.photos,post.photos);assert.equal(saved.reviews[0].decision,'rejected');assert.equal(saved.rewrites[0].source_body,post.body);assert.throws(()=>exportPost(db,String(post.id)),/APPROVAL_REQUIRED/);
 await rewritePost(db,String(post.id),{revision:1,request_id:'rewrite-ok'},{env,generate});assert.equal(calls,1);assert.equal(listPosts(db,'rewrite-task').find(p=>p.channel==='instagram')!.revision,1);
 reviewPost(db,String(post.id),{revision:2,decision:'approved',comment:'수정 검토 완료'});assert.equal(listPosts(db,'rewrite-task').find(p=>p.id===post.id)!.status,'approved');
 }finally{db.close();}});
test('rewrite failure preserves rejected text; racing editor wins over AI result',async()=>{const {db,post}=fixture();try{
 reviewPost(db,String(post.id),{revision:1,decision:'rejected',comment:'문구 수정'});
 let result=await rewritePost(db,String(post.id),{revision:1,request_id:'failure'},{env,generate:async()=>{throw Error('DO_NOT_LEAK');}});assert.equal(result.run.status,'failed');assert.equal(result.run.error_code,'AI_CONNECTION_FAILED');assert.equal(result.posts.find(p=>p.id===post.id)!.body,post.body);
 result=await rewritePost(db,String(post.id),{revision:1,request_id:'race'},{env,generate:async()=>{updatePost(db,String(post.id),{revision:1,title:'사용자 편집',body:'[가상 사례] 직접 수정',hashtags:'',photos:[]});return '[가상 사례] AI의 늦은 응답';}});assert.equal(result.run.error_code,'VERSION_CONFLICT');assert.equal(result.posts.find(p=>p.id===post.id)!.body,'[가상 사례] 직접 수정');assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.close();}});
test('same request while running calls generator once and refuses concurrent rewrite',async()=>{const {db,post}=fixture();try{
 reviewPost(db,String(post.id),{revision:1,decision:'rejected',comment:'짧게 수정'});let finish!:(s:string)=>void,calls=0;const waiting=new Promise<string>(r=>finish=r);
 const first=rewritePost(db,String(post.id),{revision:1,request_id:'in-flight'},{env,generate:async()=>{calls++;return waiting;}});
 const duplicate=await rewritePost(db,String(post.id),{revision:1,request_id:'in-flight'},{env});assert.equal(duplicate.run.status,'running');await assert.rejects(rewritePost(db,String(post.id),{revision:1,request_id:'second'},{env}),/AI_BUSY/);finish('[가상 사례] 수정 응답');await first;assert.equal(calls,1);
 }finally{db.close();}});
