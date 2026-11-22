import {uploadWorkbook,workbook,importRows,templateWorkbook,XLSX_LIMIT} from './estimate-workbooks.ts';
import {createPlan,planDetail,savePlan,reviewPlan,planList,projectWorkspace} from './project-plans.ts';
import {planPptx} from './plan-pptx.ts';
import {calendars} from './calendars.ts';
import {notionStatus,syncNotionCalendar,linkNotionEventProject} from './notion-calendar.ts';
import {linkPptProject,uploadPptSource,pptBriefs,generatePptBrief,reviewPptBrief,exportPptBrief} from './ppt-prompts.ts';
import {completedProjects,completedProject} from './completed-projects.ts';
import {generateProposal,listAutoProposals,saveProposal,proposalPrint} from './proposals.ts';
import {orderDashboard} from './order-dashboard.ts';
import {estimatePrint} from './estimate-print.ts';
import {operations,saveMaterial,saveOperation,reviewOperation,calculate,createEstimateOrders,previewOrderSchedule,linkOrderSchedule} from './operations.ts';
import {listProjects,createProject,changeProjectStage,listProposals,changeTaskKind} from './projects.ts';
import {fullBackup,restoreFull} from './full-backup.ts';
import {rewritePost} from './rewrites.ts';
import {uploadMedia,readMedia} from './media.ts';
import {listPosts,splitPosts,updatePost,reviewPost,markPosted,exportPost} from './posts.ts';
import {listPortfolios,createPortfolio,seedDemoPortfolios,generatePortfolio} from './portfolios.ts';
import {aiStatus} from './ai.ts';
import {listTasks,taskDetail,runTask,decideTask} from './tasks.ts';
import {randomUUID} from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync,writeFileSync,mkdirSync,unlinkSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './db.ts';
import { readSettings, saveSettings } from './settings.ts';
import { pathToFileURL } from 'node:url';
import { initialize, appendRole, appendRule } from './db.ts';
import type { DatabaseSync } from 'node:sqlite';
export function makeServer(db:DatabaseSync,options:{mediaRoot?:string;controlToken?:string;onStop?:()=>void}={}){return createServer(async(req,res)=>{
 const send=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 // No CORS: public demo cannot access the local database. Reject cross-site writes and DNS rebinding.
 if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return send(403,{error:'LOCAL_ONLY'});
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'ORIGIN_DENIED'});
 try{const url=new URL(req.url||'/',`http://${req.headers.host}`);const path=url.pathname;
 if(req.method==='GET'){
 const estimateExport=path.match(/^\/api\/operations\/([a-zA-Z0-9-]+)\/print$/);if(estimateExport){const html=estimatePrint(db,estimateExport[1]);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});res.end(html);return;}
 if(path==='/api/project-workspace')return send(200,projectWorkspace(db));
 if(path==='/api/project-plans')return send(200,planList(db));
 if(path==='/api/estimate-template'){const bytes=await templateWorkbook();res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="estimate-template.xlsx"','Cache-Control':'no-store'});res.end(bytes);return;}
 const wbGet=path.match(/^\/api\/estimate-workbooks\/([a-zA-Z0-9-]+)$/);if(wbGet)return send(200,workbook(db,wbGet[1]));
 const planGet=path.match(/^\/api\/project-plans\/([a-zA-Z0-9-]+)(\/pptx)?$/);if(planGet){if(!planGet[2])return send(200,planDetail(db,planGet[1]));const bytes=await planPptx(db,planGet[1],Number(url.searchParams.get('revision')),url.searchParams.get('kind')||'both');res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.presentationml.presentation','Content-Disposition':'attachment; filename="project-schedule.pptx"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);return;}
 if(path==='/api/calendars')return send(200,calendars(db,{scope:url.searchParams.get('scope')||'work',month:url.searchParams.get('month')||'',project_id:url.searchParams.get('project_id')||''}));
 if(path==='/api/notion-calendar/status')return send(200,notionStatus(db));
 if(path==='/api/ppt-briefs')return send(200,pptBriefs(db));
 const pptExport=path.match(/^\/api\/ppt-briefs\/([a-zA-Z0-9-]+)\/export$/);if(pptExport){const bytes=exportPptBrief(db,pptExport[1],options.mediaRoot);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Claude-PPT-kit.zip"','Cache-Control':'no-store'});res.end(bytes);return;}
 if(path==='/api/proposal-automation')return send(200,listAutoProposals(db));
 const proposalExport=path.match(/^\/api\/proposal-automation\/([a-zA-Z0-9-]+)\/print$/);if(proposalExport){const html=proposalPrint(db,proposalExport[1]);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"});res.end(html);return;}
 if(path==='/api/order-dashboard')return send(200,orderDashboard(db));
 if(path==='/api/operations')return send(200,operations(db));
 const assets:Record<string,[string,string]>={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/settings.js':['settings.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/live.js':['live.js','text/javascript; charset=utf-8'],'/marketing.js':['marketing.js','text/javascript; charset=utf-8'],'/database':['database.html','text/html; charset=utf-8'],'/channels.js':['channels.js','text/javascript; charset=utf-8'],'/maintenance':['maintenance.html','text/html; charset=utf-8'],'/feedback.js':['feedback.js','text/javascript; charset=utf-8'],'/proposal-automation.js':['proposal-automation.js','text/javascript; charset=utf-8'],'/order-dashboard.js':['order-dashboard.js','text/javascript; charset=utf-8'],'/customer-completed.js':['customer-completed.js','text/javascript; charset=utf-8'],'/project-workspace.js':['project-workspace.js','text/javascript; charset=utf-8'],'/calendars.js':['calendars.js','text/javascript; charset=utf-8'],'/ppt-prompts.js':['ppt-prompts.js','text/javascript; charset=utf-8'],'/completed-projects.js':['completed-projects.js','text/javascript; charset=utf-8'],'/operations.js':['operations.js','text/javascript; charset=utf-8'],'/mvp3-progress.js':['mvp3-progress.js','text/javascript; charset=utf-8'],'/mvp3-progress.json':['mvp3-progress.json','application/json; charset=utf-8']};
 if(assets[path]){const [file,type]=assets[path];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(readFileSync(resolve(root,'frontend-demo',file)));return;}
 if(path==='/api/full-backup'){const bytes=await fullBackup(db,options.mediaRoot);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="pixffice-full.zip"','Cache-Control':'no-store'});res.end(bytes);return;}
 const media=path.match(/^\/api\/media\/([a-zA-Z0-9-]+)$/);if(media){const f=readMedia(db,media[1],options.mediaRoot);if(f.meta.mime_type==='application/pdf')res.setHeader('Content-Disposition','attachment; filename="source.pdf"');res.writeHead(200,{'Content-Type':String(f.meta.mime_type),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(f.bytes);return;}
 const posts=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/posts$/);if(posts)return send(200,listPosts(db,posts[1]));
 const archive=path.match(/^\/api\/posts\/([a-zA-Z0-9-]+)\/(export|text)$/);if(archive){const f=exportPost(db,archive[1],options.mediaRoot);res.writeHead(200,{'Content-Type':archive[2]==='text'?'text/plain; charset=utf-8':'application/zip','Content-Disposition':`attachment; filename="${f.post.channel}-v${f.post.revision}.${archive[2]==='text'?'txt':'zip'}"`,'Cache-Control':'no-store'});res.end(archive[2]==='text'?f.text:f.bytes);return;}
 if(path==='/api/database'){
 const specs:Record<string,string>={project_plans:'id,project_id,workbook_id,title,revision,status,assumptions_confirmed,created_at',estimate_workbooks:'id,project_id,original_name,sha256,created_at',project_plan_reviews:'id,plan_id,revision,decision,comment,created_at',notion_calendar_events:'id,title,categories_json,start_date,end_date,remote_project,last_edited_time,created_at',ppt_prompt_briefs:'id,title,status,model,analysis_json,prompt,revision,reviewed,error_code,created_at',ppt_source_files:'media_id,created_at',proposal_briefs:'id,task_id,project_id,source_json,created_at',proposal_versions:'id,task_id,version,body,created_at',materials_catalog:'id,name,unit,supplier,price_won,lead_days,revision,created_at',operation_documents:'id,project_id,kind,title,revision,status,source_document_id,source_revision,schedule_document_id,schedule_revision,schedule_step,body_json,created_at',order_schedule_changes:'id,order_id,revision,previous_json,next_json,comment,created_at',operation_reviews:'id,document_id,revision,decision,comment,snapshot_json,created_at',ai_employees:'id,name,active',role_instructions:'id,employee_id,version,provider,responsibilities,goal,created_at',business_rules:'id,category,title,version,body,created_at',projects:'id,name,status,lifecycle_stage,revision,created_at',portfolios:'id,title,summary,materials,is_demo,created_at',media_files:'id,original_name,mime_type,byte_size,metadata_json',tasks:'id,title,kind,portfolio_id,employee_id,status,provider,model,result_version,result,created_at',approvals:'id,task_id,decision,result_version,comment,created_at',channel_posts:'id,task_id,channel,revision,status,title,body,photos_json,posted_url,created_at',channel_post_reviews:'id,post_id,revision,decision,comment,created_at',post_rewrites:'id,post_id,source_revision,result_revision,status,provider,model,rejection_comment,error_code,created_at'};
 const tables=Object.fromEntries(Object.entries(specs).map(([table,columns])=>[table,{count:db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n,rows:db.prepare(`SELECT ${columns} FROM ${table} ORDER BY created_at DESC LIMIT 100`).all()}]));return send(200,{queried_at:new Date().toISOString(),tables});
 }
 if(path==='/api/ai/status')return send(200,aiStatus());
 if(path==='/api/portfolios')return send(200,listPortfolios(db));
 if(path==='/api/tasks')return send(200,listTasks(db));
 if(path==='/api/projects')return send(200,listProjects(db));
 if(path==='/api/completed-projects')return send(200,completedProjects(db));
 const completed=path.match(/^\/api\/completed-projects\/([a-zA-Z0-9-]+)$/);if(completed)return send(200,completedProject(db,completed[1]));
 if(path==='/api/proposals')return send(200,listProposals(db));
 const task=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)$/);if(task)return send(200,taskDetail(db,task[1]));
 if(path==='/api/settings')return send(200,readSettings(db));
 if(path==='/api/health')return send(200,{mode:'local',database:'ready'});
 if(path==='/api/employees')return send(200,db.prepare('SELECT * FROM ai_employees ORDER BY code').all());
 const role=path.match(/^\/api\/employees\/([^/]+)\/roles$/);if(role)return send(200,db.prepare('SELECT * FROM role_instructions WHERE employee_id=? ORDER BY version DESC').all(role[1]));
 if(path==='/api/rules')return send(200,db.prepare('SELECT r.* FROM business_rules r WHERE version=(SELECT MAX(version) FROM business_rules WHERE rule_key=r.rule_key) AND archived=0 ORDER BY rule_key').all());
 const rule=path.match(/^\/api\/rules\/([^/]+)$/);if(rule)return send(200,db.prepare('SELECT * FROM business_rules WHERE rule_key=? ORDER BY version DESC').all(rule[1]));
 }
 if(req.method==='POST'){
 if(path==='/api/restore'){if(url.searchParams.get('activate')==='1'&&process.env.PIXFFICE_DB_PATH)return send(400,{error:'ENV_DB_OVERRIDE'});const chunks:Buffer[]=[];let size=0;for await(const c of req){size+=c.length;if(size>250*1024*1024)return send(413,{error:'BACKUP_TOO_LARGE'});chunks.push(c);}const target=resolve(root,'restores','recovered-'+Date.now()+'-'+randomUUID().slice(0,8));const result=restoreFull(Buffer.concat(chunks),target);if(url.searchParams.get('activate')==='1')writeFileSync(resolve(root,'local-data.json'),JSON.stringify({databasePath:result.database},null,2),{mode:0o600});return send(201,result);}
 if(path==='/api/estimate-workbooks'){const chunks:Buffer[]=[];let size=0;for await(const c of req){size+=c.length;if(size>XLSX_LIMIT)return send(413,{error:'XLSX_LIMIT'});chunks.push(c);}return send(201,await uploadWorkbook(db,url.searchParams.get('project_id')||'',url.searchParams.get('name')||'',Buffer.concat(chunks)));}
 if(path==='/api/ppt-sources'){const chunks:Buffer[]=[];let size=0;for await(const c of req){size+=c.length;if(size>8*1024*1024)return send(413,{error:'IMAGE_TOO_LARGE'});chunks.push(c);}return send(201,uploadPptSource(db,url.searchParams.get('name')||'source',Buffer.concat(chunks),options.mediaRoot));}
 const upload=path.match(/^\/api\/portfolios\/([a-zA-Z0-9-]+)\/media$/);if(upload){const chunks:Buffer[]=[];let size=0;for await(const c of req){size+=c.length;if(size>8*1024*1024)return send(413,{error:'IMAGE_TOO_LARGE'});chunks.push(c);}return send(201,uploadMedia(db,upload[1],url.searchParams.get('name')||'photo',Buffer.concat(chunks),options.mediaRoot));}
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON_REQUIRED'});
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)return send(413,{error:'BODY_TOO_LARGE'});}
 let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'INVALID_JSON'});}
 if(path==='/api/project-plans')return send(201,createPlan(db,body));
 const importPreview=path.match(/^\/api\/estimate-workbooks\/([a-zA-Z0-9-]+)\/preview$/);if(importPreview)return send(200,importRows(db,importPreview[1],body));
 const planAction=path.match(/^\/api\/project-plans\/([a-zA-Z0-9-]+)\/(save|review)$/);if(planAction)return send(200,planAction[2]==='save'?savePlan(db,planAction[1],body):reviewPlan(db,planAction[1],body));
 if(path==='/api/notion-calendar/sync')return send(200,await syncNotionCalendar(db));
 const notionProject=path.match(/^\/api\/notion-calendar\/([a-zA-Z0-9-]+)\/project$/);if(notionProject)return send(200,linkNotionEventProject(db,notionProject[1],body));
 if(path==='/api/ppt-briefs')return send(200,await generatePptBrief(db,body,{mediaRoot:options.mediaRoot}));
 const pptProject=path.match(/^\/api\/ppt-briefs\/([a-zA-Z0-9-]+)\/project$/);if(pptProject)return send(200,linkPptProject(db,pptProject[1],body));
 const pptReview=path.match(/^\/api\/ppt-briefs\/([a-zA-Z0-9-]+)\/review$/);if(pptReview)return send(200,reviewPptBrief(db,pptReview[1],body));
 if(path==='/api/proposal-automation')return send(200,await generateProposal(db,body));
 const proposalSave=path.match(/^\/api\/proposal-automation\/([a-zA-Z0-9-]+)\/save$/);if(proposalSave)return send(200,saveProposal(db,proposalSave[1],body));
 const scheduleLink=path.match(/^\/api\/operations\/([a-zA-Z0-9-]+)\/(schedule-preview|schedule)$/);if(scheduleLink)return send(200,scheduleLink[2]==='schedule-preview'?previewOrderSchedule(db,scheduleLink[1],body):linkOrderSchedule(db,scheduleLink[1],body));
 const convertEstimate=path.match(/^\/api\/operations\/([a-zA-Z0-9-]+)\/orders$/);if(convertEstimate)return send(200,createEstimateOrders(db,convertEstimate[1],body));
 if(path==='/api/materials')return send(200,saveMaterial(db,body));
 if(path==='/api/operations/preview')return send(200,calculate(db,body.kind,body.body));
 if(path==='/api/operations')return send(200,saveOperation(db,body));
 const opReview=path.match(/^\/api\/operations\/([a-zA-Z0-9-]+)\/review$/);if(opReview)return send(200,reviewOperation(db,opReview[1],body));
 const split=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/posts$/);if(split)return send(200,splitPosts(db,split[1]));
 if(path==='/api/control/stop'){if(!options.controlToken||body?.token!==options.controlToken)return send(403,{error:'DENIED'});send(200,{stopping:true});setTimeout(()=>options.onStop?.(),100);return;}
 const rewrite=path.match(/^\/api\/posts\/([a-zA-Z0-9-]+)\/rewrite$/);if(rewrite)return send(200,await rewritePost(db,rewrite[1],body));
 const post=path.match(/^\/api\/posts\/([a-zA-Z0-9-]+)\/(save|review|posted)$/);if(post)return send(200,post[2]==='save'?updatePost(db,post[1],body):post[2]==='review'?reviewPost(db,post[1],body):markPosted(db,post[1],body));
 if(path==='/api/portfolios/demo')return send(200,seedDemoPortfolios(db));
 if(path==='/api/portfolios')return send(201,createPortfolio(db,body));
 const marketing=path.match(/^\/api\/portfolios\/([a-zA-Z0-9-]+)\/generate$/);if(marketing)return send(200,await generatePortfolio(db,marketing[1],body));
 if(path==='/api/tasks')return send(200,await runTask(db,body));
 const approval=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/approvals$/);if(approval)return send(201,decideTask(db,approval[1],body));
 if(path==='/api/projects')return send(201,createProject(db,body));
 const projectStage=path.match(/^\/api\/projects\/([a-zA-Z0-9-]+)\/stage$/);if(projectStage)return send(200,changeProjectStage(db,projectStage[1],body));
 const taskKind=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/kind$/);if(taskKind)return send(200,changeTaskKind(db,taskKind[1],body));
 if(path==='/api/settings')return send(200,saveSettings(db,body));
 if(!body||typeof body!=='object'||!Number.isSafeInteger(body.expected_version)||body.expected_version<0)return send(400,{error:'EXPECTED_VERSION_REQUIRED'});
 const role=path.match(/^\/api\/employees\/([^/]+)\/roles$/);if(role)return send(201,appendRole(db,role[1],body.expected_version,body));
 const rule=path.match(/^\/api\/rules\/([a-z0-9_-]{1,80})$/);if(rule)return send(201,appendRule(db,rule[1],body.expected_version,body));
 }
 send(404,{error:'NOT_FOUND'});
 }catch(e){const m=e instanceof Error?e.message:'';const allowed=['INVALID_XLSX','XLSX_LIMIT','XLSX_EMPTY','WORKBOOK_NOT_FOUND','INVALID_MAPPING','INVALID_EXCEL_CELL','PLAN_LIMIT','INVALID_PLAN','PLAN_NOT_FOUND','PLAN_CONFIRM_REQUIRED','NOTION_NOT_CONFIGURED','NOTION_SYNC_BUSY','NOTION_RATE_LIMIT','NOTION_AUTH_FAILED','NOTION_ACCESS_DENIED','NOTION_REQUEST_FAILED','NOTION_SCHEMA_MISMATCH','NOTION_INVALID_DATA','NOTION_INVALID_DATE','NOTION_TOO_MANY_EVENTS','INVALID_MONTH','INVALID_DOCUMENT','INVALID_ANALYSIS','FILES_TOO_LARGE','SCHEDULE_CHANGED','ORDER_ALREADY_SENT','PROJECT_MISMATCH','SOURCE_CHANGED','LINKED_ORDER_READ_ONLY','VERSION_CONFLICT','CLAUDE_NOT_CONFIGURED','SELECT_CLAUDE_FOR_EMPLOYEE','TASK_NOT_FOUND','PROMPT_TOO_LARGE','PORTFOLIO_NOT_FOUND','AI_BUSY','GEMINI_NOT_CONFIGURED','SELECT_GEMINI_FOR_EMPLOYEE','APPROVAL_REQUIRED','CHANNEL_SPLIT_FAILED','POSTS_NOT_AVAILABLE','INVALID_IMAGE','IMAGE_TOO_LARGE','INVALID_MEDIA','PROJECT_NOT_FOUND','REJECTION_REQUIRED','INVALID_BACKUP','INCOMPATIBLE_BACKUP','MISSING_MEDIA','MEDIA_HASH_MISMATCH','BACKUP_TOO_LARGE','RESTORE_TARGET_EXISTS'];send(m==='VERSION_CONFLICT'?409:(m==='CLAUDE_NOT_CONFIGURED'||m==='GEMINI_NOT_CONFIGURED')?503:m==='TASK_NOT_FOUND'?404:400,{error:allowed.includes(m)?m:'INVALID_REQUEST'});}
 });}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=initialize();db.exec("UPDATE tasks SET status='failed',error_code='SERVER_RESTARTED' WHERE status='running'");db.exec("UPDATE post_rewrites SET status='failed',error_code='SERVER_RESTARTED',completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE status='running'");db.exec("UPDATE ppt_prompt_briefs SET status='failed',error_code='SERVER_RESTARTED' WHERE status='running'");const port=Number(process.env.PIXFFICE_PORT||4313),token=randomUUID(),runtimeFile=resolve(root,'.runtime/server.json');
 const stop=()=>server.close(()=>{db.close();try{if(JSON.parse(readFileSync(runtimeFile,'utf8')).token===token)unlinkSync(runtimeFile);}catch{}process.exit(0);});
 const server=makeServer(db,{controlToken:token,onStop:stop});server.listen(port,'127.0.0.1',()=>{mkdirSync(resolve(root,'.runtime'),{recursive:true,mode:0o700});writeFileSync(runtimeFile,JSON.stringify({pid:process.pid,port,token}),{mode:0o600});console.log('로컬 화면: http://127.0.0.1:'+port);});for(const sig of ['SIGINT','SIGTERM'] as const)process.on(sig,stop);}
