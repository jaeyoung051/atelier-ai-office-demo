import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialize} from '../db.ts';
import {createProject} from '../projects.ts';
import {saveOperation,reviewOperation,createEstimateOrders,saveMaterial} from '../operations.ts';
import {estimatePrint} from '../estimate-print.ts';
test('approved estimate conversion is atomic, idempotent, snapshots price, includes allowance, blocks stale approvals',()=>{const db=initialize(':memory:');try{
const p:any=createProject(db,{name:'<script>悪意</script>',detail:''});const input={project_id:p.id,title:'<b>견적</b>',kind:'estimate',body:{items:[{material_id:'demo-floor',quantity:'1.125',waste_bps:500},{material_id:'demo-light',quantity:'2'}]}};
const q:any=saveOperation(db,input);const convert={revision:1,required_date:'2026-12-01',buffer_days:2};assert.throws(()=>createEstimateOrders(db,q.id,convert),/APPROVAL_REQUIRED/);assert.throws(()=>estimatePrint(db,q.id),/APPROVAL_REQUIRED/);reviewOperation(db,q.id,{revision:1,decision:'approved',comment:''});
saveMaterial(db,{id:'demo-floor',revision:1,name:'다른 이름',unit:'개',supplier:'다른 공급처',price_won:999,lead_days:1});
const r:any=createEstimateOrders(db,q.id,convert);assert.equal(r.documents.length,2);const body=JSON.parse(r.documents[0].body_json);assert.equal(body.price_won,25000);assert.equal(body.name,'[가상] 바닥재');assert.equal(body.quantity,'1.182');assert.equal(body.amount_won,29550);assert.equal(createEstimateOrders(db,q.id,convert).reused,true);assert.equal(db.prepare("SELECT count(*) n FROM operation_documents WHERE kind='order'").get()?.n,2);
const html=estimatePrint(db,q.id);assert.ok(html.includes('&lt;b&gt;견적&lt;/b&gt;'));assert.ok(!html.includes('<script>悪意'));assert.ok(html.includes('합계'));assert.ok(html.includes('window.print()'));
reviewOperation(db,r.documents[0].id,{revision:1,decision:'approved',comment:''});saveOperation(db,{...input,id:q.id,revision:1});assert.throws(()=>reviewOperation(db,r.documents[0].id,{revision:1,decision:'ordered',comment:''}),/SOURCE_CHANGED/);assert.throws(()=>reviewOperation(db,r.documents[1].id,{revision:1,decision:'approved',comment:''}),/SOURCE_CHANGED/);assert.throws(()=>estimatePrint(db,q.id),/APPROVAL_REQUIRED/);
reviewOperation(db,q.id,{revision:2,decision:'approved',comment:''});assert.equal(createEstimateOrders(db,q.id,{...convert,revision:2}).documents.length,2);assert.throws(()=>saveOperation(db,{id:r.documents[0].id,revision:1,kind:'order',project_id:p.id,title:'수정',body:{material_id:'demo-light',quantity:'1',required_date:'2026-12-01'}}),/LINKED_ORDER_READ_ONLY/);
}finally{db.close();}});

test('operations HTTP routes: conversion, duplicate retry, approved print and local-only access',async()=>{const {makeServer}=await import('../server.ts');const db=initialize(':memory:');const p:any=createProject(db,{name:'[가상] HTTP 현장',detail:''});const server=makeServer(db);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+(server.address() as any).port;const post=async(path:string,body:any)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});try{
let response=await post('/api/operations',{project_id:p.id,kind:'estimate',title:'[가상] HTTP 견적',body:{items:[{material_id:'demo-light',quantity:'2'}]}});assert.equal(response.status,200);const q:any=await response.json();assert.equal((await fetch(base+'/api/operations/'+q.id+'/print')).status,400);assert.equal((await post('/api/operations/'+q.id+'/review',{revision:1,decision:'approved',comment:''})).status,200);
const input={revision:1,required_date:'2026-12-01',buffer_days:2};const converted:any=await (await post('/api/operations/'+q.id+'/orders',input)).json();assert.equal(converted.documents.length,1);assert.equal((await (await post('/api/operations/'+q.id+'/orders',input)).json() as any).reused,true);
response=await fetch(base+'/api/operations/'+q.id+'/print');assert.ok(response.headers.get('content-type')?.includes('text/html'));assert.equal(response.headers.get('cache-control'),'no-store');assert.ok((await response.text()).includes('90,000원'));
response=await fetch(base+'/api/operations',{headers:{Origin:'https://example.com'}});assert.equal(response.status,403);assert.equal((await fetch(base+'/api/database')).status,200);
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));db.close();}});
