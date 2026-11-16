import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {transaction} from './db.ts';
const fail=()=>{throw Error('INVALID_FIELDS');};
const str=(v:any,max=200)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():fail();
const int=(v:any,max=1000000000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:fail();
const money=(n:bigint,d:bigint)=>{const x=Number((n+d/2n)/d);return int(x);};
function date(v:any){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail();return v;}
const shift=(s:string,n:number)=>{const d=new Date(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
function working(s:string,holidays:string[]){return ![0,6].includes(new Date(s).getUTCDay())&&!holidays.includes(s);}
export function calculate(db:DatabaseSync,kind:string,b:any):any{
 if(!b||typeof b!=='object')fail();
 if(kind==='estimate'){
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)fail();
 const items=b.items.map((i:any)=>{const m=db.prepare('SELECT * FROM materials_catalog WHERE id=?').get(str(i.material_id));if(!m)fail();const qty=String(i.quantity);if(!/^\d{1,6}(\.\d{1,3})?$/.test(qty)||Number(qty)<=0)fail();const quantity_milli=Math.round(Number(qty)*1000),waste_bps=int(i.waste_bps??0,10000);return {material_id:m.id,name:m.name,unit:m.unit,supplier:m.supplier,price_won:m.price_won,quantity:qty,waste_bps,amount_won:money(BigInt(m.price_won as number)*BigInt(quantity_milli)*BigInt(10000+waste_bps),10000000n)};});
 const labor_won=int(b.labor_won??0),other_won=int(b.other_won??0),discount_won=int(b.discount_won??0),tax_bps=int(b.tax_bps??0,10000);
 const subtotal_won=int(items.reduce((s:number,i:any)=>s+i.amount_won,0)+labor_won+other_won-discount_won),tax_won=money(BigInt(subtotal_won)*BigInt(tax_bps),10000n);
 return {items,labor_won,other_won,discount_won,tax_bps,subtotal_won,tax_won,total_won:int(subtotal_won+tax_won)};
 }
 if(kind==='schedule'){
 let cursor=date(b.start_date);if(!Array.isArray(b.holidays)||b.holidays.length>100||!Array.isArray(b.steps)||!b.steps.length||b.steps.length>100)fail();const holidays=b.holidays.map(date);
 const steps=b.steps.map((s:any)=>{const days=int(s.days,365);if(!days)fail();const calendar=s.calendar===true;let guard=0;while(!calendar&&!working(cursor,holidays)){cursor=shift(cursor,1);if(++guard>500)fail();}const start=cursor;let count=1;while(count<days){cursor=shift(cursor,1);if(calendar||working(cursor,holidays))count++;}const end=cursor;cursor=shift(cursor,1);return {name:str(s.name),days,calendar,start_date:start,end_date:end};});
 return {start_date:b.start_date,holidays,steps,end_date:steps.at(-1).end_date};
 }
 if(kind==='order'){
 const m=db.prepare('SELECT * FROM materials_catalog WHERE id=?').get(str(b.material_id));if(!m)fail();const quantity=String(b.quantity);if(!/^\d{1,6}(\.\d{1,3})?$/.test(quantity)||Number(quantity)<=0)fail();const required_date=date(b.required_date),lead_days=int(b.lead_days??m.lead_days,365),buffer_days=int(b.buffer_days??0,365);let recommended_date=required_date;for(let n=0;n<lead_days+buffer_days;){recommended_date=shift(recommended_date,-1);if(working(recommended_date,[]))n++;}
 return {material_id:m.id,name:m.name,unit:m.unit,supplier:m.supplier,price_won:m.price_won,quantity,amount_won:money(BigInt(m.price_won as number)*BigInt(Math.round(Number(quantity)*1000)),1000n),required_date,lead_days,buffer_days,recommended_date};
 }fail();
}
export function operations(db:DatabaseSync){return {materials:db.prepare('SELECT * FROM materials_catalog ORDER BY name').all(),documents:db.prepare('SELECT * FROM operation_documents ORDER BY created_at DESC,id').all().map((r:any)=>({...r,body:JSON.parse(r.body_json),schedule_changes:db.prepare('SELECT revision,comment,created_at FROM order_schedule_changes WHERE order_id=? ORDER BY revision').all(r.id),reviews:db.prepare('SELECT revision,decision,comment,created_at FROM operation_reviews WHERE document_id=? ORDER BY created_at').all(r.id)}))};}
export function saveMaterial(db:DatabaseSync,b:any){const values=[str(b.name),str(b.unit,30),typeof b.supplier==='string'&&b.supplier.length<=200?b.supplier:fail(),int(b.price_won),int(b.lead_days,365)];return transaction(db,()=>{const id=b.id||randomUUID();if(b.id){if(!Number.isSafeInteger(b.revision))fail();const r=db.prepare("UPDATE materials_catalog SET name=?,unit=?,supplier=?,price_won=?,lead_days=?,revision=revision+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND revision=?").run(...values,id,b.revision);if(!r.changes)throw Error('VERSION_CONFLICT');}else db.prepare('INSERT INTO materials_catalog(name,unit,supplier,price_won,lead_days,id) VALUES (?,?,?,?,?,?)').run(...values,id);return db.prepare('SELECT * FROM materials_catalog WHERE id=?').get(id);});}
export function saveOperation(db:DatabaseSync,b:any){return transaction(db,()=>{const kind=str(b.kind),title=str(b.title),project=str(b.project_id);if(!db.prepare('SELECT 1 FROM projects WHERE id=?').get(project))throw Error('PROJECT_NOT_FOUND');const body=calculate(db,kind,b.body),id=b.id||randomUUID();if(b.id){const prior:any=db.prepare('SELECT * FROM operation_documents WHERE id=?').get(id);if(!prior||prior.revision!==b.revision)throw Error('VERSION_CONFLICT');if(prior.source_document_id||prior.schedule_document_id)throw Error('LINKED_ORDER_READ_ONLY');if(prior.kind!==kind||prior.project_id!==project||['ordered','received'].includes(prior.status))fail();db.prepare("UPDATE operation_documents SET title=?,body_json=?,revision=revision+1,status='review',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").run(title,JSON.stringify(body),id);}else db.prepare('INSERT INTO operation_documents(id,project_id,kind,title,body_json) VALUES (?,?,?,?,?)').run(id,project,kind,title,JSON.stringify(body));return db.prepare('SELECT * FROM operation_documents WHERE id=?').get(id);});}
export function reviewOperation(db:DatabaseSync,id:string,b:any){return transaction(db,()=>{const r:any=db.prepare('SELECT * FROM operation_documents WHERE id=?').get(id);if(!r||r.revision!==b.revision)throw Error('VERSION_CONFLICT');if(r.kind==='order'&&['approved','ordered'].includes(b.decision))assertOrderSource(db,r);const transitions:any={review:['approved','rejected'],approved:r.kind==='order'?['ordered']:[],ordered:r.kind==='order'?['received']:[]};if(!transitions[r.status]?.includes(b.decision))fail();const comment=typeof b.comment==='string'&&b.comment.length<=2000?b.comment:fail();if(b.decision==='rejected'&&!comment.trim())fail();db.prepare('INSERT INTO operation_reviews(id,document_id,revision,decision,comment,snapshot_json) VALUES (?,?,?,?,?,?)').run(randomUUID(),id,r.revision,b.decision,comment,JSON.stringify(r));db.prepare("UPDATE operation_documents SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").run(b.decision,id);return {id,status:b.decision};});}

/** Atomic, idempotent conversion of an approved estimate version. Preserve quoted prices. */
export function createEstimateOrders(db:DatabaseSync,id:string,b:any){return transaction(db,()=>{
 const source:any=db.prepare("SELECT * FROM operation_documents WHERE id=? AND kind='estimate'").get(id);
 if(!source||source.revision!==b?.revision)throw Error('VERSION_CONFLICT');
 if(source.status!=='approved')throw Error('APPROVAL_REQUIRED');
 const prior=db.prepare('SELECT * FROM operation_documents WHERE source_document_id=? AND source_revision=? ORDER BY source_item').all(id,source.revision);
 if(prior.length)return {documents:prior,reused:true};
 const required_date=date(b.required_date),buffer_days=int(b.buffer_days??0,365),items=JSON.parse(source.body_json).items;
 const documents=items.map((item:any,index:number)=>{
 // Round procurement up to 0.001 unit so it includes the quoted allowance.
 const milli=BigInt(Math.round(Number(item.quantity)*1000)),effective=(milli*BigInt(10000+item.waste_bps)+9999n)/10000n;
 const quantity=(Number(effective)/1000).toFixed(3).replace(/\.?0+$/,'');
 const dates=calculate(db,'order',{material_id:item.material_id,quantity,required_date,buffer_days});
 const body={...dates,name:item.name,unit:item.unit,supplier:item.supplier,price_won:item.price_won,amount_won:money(BigInt(item.price_won)*effective,1000n),estimate_quantity:item.quantity,estimate_waste_bps:item.waste_bps};
 const target=randomUUID();db.prepare('INSERT INTO operation_documents(id,project_id,kind,title,body_json,source_document_id,source_revision,source_item) VALUES (?,?,?,?,?,?,?,?)').run(target,source.project_id,'order',`${source.title} / ${item.name}`.slice(0,200),JSON.stringify(body),id,source.revision,index);
 return db.prepare('SELECT * FROM operation_documents WHERE id=?').get(target);
 });return {documents,reused:false};
});}

export function assertOrderSource(db:DatabaseSync,r:any){
 if(r.source_document_id){const source:any=db.prepare('SELECT revision,status FROM operation_documents WHERE id=?').get(r.source_document_id);if(!source||source.revision!==r.source_revision||source.status!=='approved')throw Error('SOURCE_CHANGED');}
 if(r.schedule_document_id){const schedule:any=db.prepare('SELECT revision,status FROM operation_documents WHERE id=?').get(r.schedule_document_id);if(!schedule||schedule.revision!==r.schedule_revision||schedule.status!=='approved')throw Error('SCHEDULE_CHANGED');}
}

function prepareScheduleLink(db:DatabaseSync,id:string,b:any){
 const order:any=db.prepare("SELECT * FROM operation_documents WHERE id=? AND kind='order'").get(id);
 if(!order||order.revision!==b?.revision)throw Error('VERSION_CONFLICT');
 if(['ordered','received'].includes(order.status))throw Error('ORDER_ALREADY_SENT');
 // A changed estimate must be resolved by creating requests from the latest approved estimate.
 if(order.source_document_id){const source:any=db.prepare('SELECT revision,status FROM operation_documents WHERE id=?').get(order.source_document_id);if(!source||source.revision!==order.source_revision||source.status!=='approved')throw Error('SOURCE_CHANGED');}
 const schedule:any=db.prepare("SELECT * FROM operation_documents WHERE id=? AND kind='schedule'").get(str(b.schedule_id));
 if(!schedule||schedule.revision!==b.schedule_revision)throw Error('VERSION_CONFLICT');
 if(schedule.project_id!==order.project_id)throw Error('PROJECT_MISMATCH');
 if(schedule.status!=='approved')throw Error('APPROVAL_REQUIRED');
 const plan=JSON.parse(schedule.body_json),step_index=int(b.step_index,99),step=plan.steps[step_index];if(!step)fail();
 const old=JSON.parse(order.body_json),buffer_days=int(b.buffer_days??old.buffer_days,365),lead_days=int(old.lead_days,365),required_date=date(step.start_date);
 let recommended_date=required_date;
 for(let n=0;n<lead_days+buffer_days;){recommended_date=shift(recommended_date,-1);if(working(recommended_date,plan.holidays))n++;}
 const body={...old,required_date,recommended_date,buffer_days,schedule_name:schedule.title,schedule_step_name:step.name,schedule_holidays:plan.holidays};
 return {order,schedule,step_index,body};
}
export function previewOrderSchedule(db:DatabaseSync,id:string,b:any){const p=prepareScheduleLink(db,id,b);return {body:p.body,schedule_id:p.schedule.id,schedule_revision:p.schedule.revision,step_index:p.step_index};}
export function linkOrderSchedule(db:DatabaseSync,id:string,b:any){return transaction(db,()=>{
 const {order,schedule,step_index,body}=prepareScheduleLink(db,id,b);
 if(order.status!=='rejected'&&order.schedule_document_id===schedule.id&&order.schedule_revision===schedule.revision&&order.schedule_step===step_index&&JSON.stringify(body)===order.body_json)return {id,reused:true,revision:order.revision};
 const comment=str(b.comment,2000),next={...order,body_json:JSON.stringify(body),schedule_document_id:schedule.id,schedule_revision:schedule.revision,schedule_step:step_index,revision:order.revision+1,status:'review'};
 db.prepare('INSERT INTO order_schedule_changes(id,order_id,revision,previous_json,next_json,comment) VALUES (?,?,?,?,?,?)').run(randomUUID(),id,next.revision,JSON.stringify(order),JSON.stringify(next),comment);
 db.prepare("UPDATE operation_documents SET body_json=?,schedule_document_id=?,schedule_revision=?,schedule_step=?,revision=revision+1,status='review',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").run(next.body_json,schedule.id,schedule.revision,step_index,id);
 return {id,reused:false,revision:next.revision};
});}
