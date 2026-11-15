import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {transaction} from './db.ts';
import {splitPosts} from './posts.ts';
import {runTask} from './tasks.ts';
export function listPortfolios(db:DatabaseSync){return db.prepare('SELECT * FROM portfolios ORDER BY created_at DESC').all().map(p=>({...p,tags:JSON.parse(String(p.tags_json)),media:db.prepare('SELECT m.id,m.original_name,m.mime_type,m.metadata_json FROM media_files m JOIN portfolio_media pm ON pm.media_id=m.id WHERE pm.portfolio_id=? ORDER BY pm.sort_order').all(p.id)}));}
export function createPortfolio(db:DatabaseSync,b:any){
 if(!b||typeof b.name!=='string'||!b.name.trim()||b.name.length>120||typeof b.note!=='string'||b.note.length>3000||typeof b.spec!=='string'||b.spec.length>3000||typeof b.area!=='number'||!Number.isFinite(b.area)||b.area<=0||b.area>10000||!Array.isArray(b.tags)||b.tags.length<1||b.tags.length>20||!b.tags.every((t:any)=>typeof t==='string'&&t.trim()&&t.length<=60))throw Error('INVALID_FIELDS');
 const id=randomUUID();db.prepare('INSERT INTO portfolios(id,project_id,title,summary,area_m2,tags_json,materials) VALUES (?,?,?,?,?,?,?)').run(id,b.projectId||null,b.name.trim(),b.note,b.area*3.305785,JSON.stringify(b.tags),b.spec);return listPortfolios(db).find(p=>p.id===id);
}
export function seedDemoPortfolios(db:DatabaseSync){transaction(db,()=>{
 const examples=[['demo-wood31','[가상 사례] 31평 우드톤 아파트',31,['주방','수납','바닥'],'가상 오크 무늬 마감재, 무광 화이트 주방가구','가상 요청: 주방 동선 개선과 거실 수납 정리. 제안 구성: 우드톤 바닥, 화이트 주방, 벽면 수납. 실제 시공·고객 후기·공사비·공사기간은 없음.'],['demo-bath24','[가상 사례] 24평 욕실·주방 개선',24,['욕실','주방','조명'],'가상 600×600 타일, 무광 수전, 간접조명','가상 요청: 관리하기 쉬운 욕실과 밝은 주방. 제안 구성: 중성색 타일과 작업 조명. 실제 성능 검증·공사비·기간·고객 후기는 없음.']];
 for(const [id,title,area,tags,materials,summary] of examples){db.prepare('INSERT INTO portfolios(id,title,summary,area_m2,tags_json,materials,is_demo) VALUES (?,?,?,?,?,?,1) ON CONFLICT(id) DO NOTHING').run(String(id),String(title),String(summary),Number(area)*3.305785,JSON.stringify(tags),String(materials));
 const mediaId=String(id)+'-placeholder';db.prepare("INSERT INTO media_files(id,storage_path,original_name,mime_type,byte_size,metadata_json) VALUES (?,?,?,'application/x-placeholder',0,?) ON CONFLICT(id) DO NOTHING").run(mediaId,'placeholders/'+String(id)+'.placeholder','[사진 없음] 가상 사진 배치 메모',JSON.stringify({is_placeholder:true,file_exists:false,caption:'실제 사진 없음. 원고에 [사진 삽입 예정]으로 표시.'}));
 db.prepare('INSERT INTO portfolio_media(id,portfolio_id,media_id) VALUES (?,?,?) ON CONFLICT(portfolio_id,media_id) DO NOTHING').run(String(id)+'-media-link',String(id),mediaId);
 }
 });return listPortfolios(db);}
export async function generatePortfolio(db:DatabaseSync,id:string,b:any,options:Parameters<typeof runTask>[2]={}){
 const p=listPortfolios(db).find(p=>p.id===id);if(!p)throw Error('PORTFOLIO_NOT_FOUND');
 const input=`다음 사례 자료만 근거로 한국어 홍보 원고 묶음을 작성하세요.\n[Instagram] 150~250자와 해시태그 4개\n[블로그] 제목과 소제목 3개를 포함하여 500~700자\n[Threads] 150~250자\n각 채널을 위 제목으로 구분하세요. 사례가 가상이면 모든 채널 첫 문장에 [가상 사례·게시용 아님]을 표시하세요. 고객 후기·실제 성과·가격·일정을 지어내지 마세요. 사진 메타데이터는 사진을 실제로 본 근거가 아닙니다. 실제 사진이 없으면 [사진 삽입 예정]으로 표시하세요. 끝에 사용자 검토 항목을 적으세요.\n사례자료(JSON):\n${JSON.stringify({title:p.title,summary:p.summary,area_pyeong:Math.round(Number(p.area_m2)/3.305785*10)/10,tags:p.tags,materials:p.materials,is_demo:p.is_demo,media:p.media})}`;
 const task=await runTask(db,{id:b?.id,title:'[홍보 원고 묶음] '+String(p.title),input,employee_id:'design',project_id:p.project_id,portfolio_id:id},options);
 if(task.status==='review')splitPosts(db,String(task.id));return task;
}
