import type {DatabaseSync} from 'node:sqlite';
const addDays=(day:string,n:number)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export function seoulDay(now:Date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');}
/** Read-only derived status. Does not mutate approvals, send reminders, or place orders. */
export function orderDashboard(db:DatabaseSync,now=new Date()){
 const today=seoulDay(now),dueUntil=addDays(today,3);
 const rows:any[]=db.prepare(`SELECT o.*,p.name project_name,e.revision estimate_current_revision,e.status estimate_current_status,s.revision schedule_current_revision,s.status schedule_current_status
 FROM operation_documents o JOIN projects p ON p.id=o.project_id
 LEFT JOIN operation_documents e ON e.id=o.source_document_id
 LEFT JOIN operation_documents s ON s.id=o.schedule_document_id
 WHERE o.kind='order' AND o.status!='received' ORDER BY o.created_at,o.id`).all();
 const items=rows.map(r=>{const b=JSON.parse(r.body_json),flags=[];
 if(r.source_document_id&&(r.estimate_current_revision!==r.source_revision||r.estimate_current_status!=='approved'))flags.push('estimate_changed');
 if(r.schedule_document_id&&(r.schedule_current_revision!==r.schedule_revision||r.schedule_current_status!=='approved'))flags.push('schedule_changed');
 let category:string;
 if(r.status==='ordered')category=b.required_date<today?'delivery_overdue':b.required_date===today?'delivery_today':'awaiting_delivery';
 else if(flags.length||r.status==='rejected')category='review_required';
 else category=b.recommended_date<today?'order_overdue':b.recommended_date<=dueUntil?'order_due':'planned';
 const delay_days=category==='delivery_overdue'?Math.round((Date.parse(today)-Date.parse(b.required_date))/86400000):category==='order_overdue'?Math.round((Date.parse(today)-Date.parse(b.recommended_date))/86400000):0;
 return {id:r.id,project_id:r.project_id,project_name:r.project_name,title:r.title,status:r.status,revision:r.revision,category,flags,delay_days,material_name:b.name,supplier:b.supplier,quantity:b.quantity,unit:b.unit,amount_won:b.amount_won,required_date:b.required_date,recommended_date:b.recommended_date,schedule_step_name:b.schedule_step_name||''};
 });
 const priority=['review_required','delivery_overdue','order_overdue','delivery_today','order_due','awaiting_delivery','planned'];
 items.sort((a,b)=>priority.indexOf(a.category)-priority.indexOf(b.category)||a.required_date.localeCompare(b.required_date)||a.id.localeCompare(b.id));
 return {queried_at:now.toISOString(),today,time_zone:'Asia/Seoul',due_until:dueUntil,due_calendar_days:3,counts:Object.fromEntries(priority.map(k=>[k,items.filter(i=>i.category===k).length])),items};
}
