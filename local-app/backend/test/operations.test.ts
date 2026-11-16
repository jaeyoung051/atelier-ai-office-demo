import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialize,migrate} from '../db.ts';
import {calculate,saveOperation,reviewOperation,saveMaterial,operations} from '../operations.ts';
import {createProject} from '../projects.ts';
test('MVP3: exact amounts, snapshots, revision approval and manual order workflow',()=>{
const db=initialize(':memory:');try{const p:any=createProject(db,{name:'[가상] 테스트',detail:''});
const body={items:[{material_id:'demo-floor',quantity:'1.125',waste_bps:500}],labor_won:1000,tax_bps:1000};
const c=calculate(db,'estimate',body);assert.equal(c.items[0].amount_won,29531);assert.equal(c.total_won,33584);
const d:any=saveOperation(db,{project_id:p.id,kind:'estimate',title:'견적',body});reviewOperation(db,d.id,{revision:1,decision:'approved',comment:''});
saveMaterial(db,{id:'demo-floor',revision:1,name:'새 단가',unit:'㎡',supplier:'가상',price_won:99999,lead_days:5});assert.equal(JSON.parse((db.prepare('SELECT body_json FROM operation_documents WHERE id=?').get(d.id) as any).body_json).items[0].price_won,25000);
const edited:any=saveOperation(db,{id:d.id,revision:1,project_id:p.id,kind:'estimate',title:'수정',body});assert.equal(edited.status,'review');assert.throws(()=>reviewOperation(db,d.id,{revision:1,decision:'approved',comment:''}),/VERSION_CONFLICT/);assert.equal(operations(db).documents[0].reviews.length,1);
const order:any=saveOperation(db,{project_id:p.id,kind:'order',title:'발주',body:{material_id:'demo-light',quantity:'2',required_date:'2026-11-23',buffer_days:1}});assert.equal(JSON.parse(order.body_json).recommended_date,'2026-11-17');assert.throws(()=>reviewOperation(db,order.id,{revision:1,decision:'ordered',comment:''}));for(const decision of ['approved','ordered','received'])reviewOperation(db,order.id,{revision:1,decision,comment:''});assert.throws(()=>saveOperation(db,{...order,body:{material_id:'demo-light',quantity:'1',required_date:'2026-11-23'}}));
migrate(db);assert.equal(db.prepare('SELECT count(*) n FROM materials_catalog').get()?.n,3);
assert.throws(()=>calculate(db,'estimate',{items:[{material_id:'demo-tile',quantity:'-1'}]}));assert.throws(()=>calculate(db,'estimate',{...body,discount_won:99999999}));assert.throws(()=>calculate(db,'order',{material_id:'demo-light',quantity:'1',required_date:'2026-02-30'}));
}finally{db.close();}});
test('MVP3: sequential working days, holidays and curing calendar days',()=>{const db=initialize(':memory:');try{const r=calculate(db,'schedule',{start_date:'2026-11-20',holidays:['2026-11-23'],steps:[{name:'철거',days:2},{name:'양생',days:2,calendar:true},{name:'마감',days:2}]});assert.equal(r.steps[0].end_date,'2026-11-24');assert.equal(r.steps[1].end_date,'2026-11-26');assert.equal(r.steps[2].end_date,'2026-11-30');}finally{db.close();}});
