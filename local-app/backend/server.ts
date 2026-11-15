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
 const assets:Record<string,[string,string]>={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/settings.js':['settings.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/live.js':['live.js','text/javascript; charset=utf-8'],'/marketing.js':['marketing.js','text/javascript; charset=utf-8'],'/database':['database.html','text/html; charset=utf-8'],'/channels.js':['channels.js','text/javascript; charset=utf-8'],'/maintenance':['maintenance.html','text/html; charset=utf-8']};
 if(assets[path]){const [file,type]=assets[path];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(readFileSync(resolve(root,'frontend-demo',file)));return;}
 if(path==='/api/full-backup'){const bytes=await fullBackup(db,options.mediaRoot);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="pixffice-full.zip"','Cache-Control':'no-store'});res.end(bytes);return;}
 const media=path.match(/^\/api\/media\/([a-zA-Z0-9-]+)$/);if(media){const f=readMedia(db,media[1],options.mediaRoot);res.writeHead(200,{'Content-Type':String(f.meta.mime_type),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(f.bytes);return;}
 const posts=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/posts$/);if(posts)return send(200,listPosts(db,posts[1]));
 const archive=path.match(/^\/api\/posts\/([a-zA-Z0-9-]+)\/(export|text)$/);if(archive){const f=exportPost(db,archive[1],options.mediaRoot);res.writeHead(200,{'Content-Type':archive[2]==='text'?'text/plain; charset=utf-8':'application/zip','Content-Disposition':`attachment; filename="${f.post.channel}-v${f.post.revision}.${archive[2]==='text'?'txt':'zip'}"`,'Cache-Control':'no-store'});res.end(archive[2]==='text'?f.text:f.bytes);return;}
 if(path==='/api/database'){
 const specs:Record<string,string>={ai_employees:'id,name,active',role_instructions:'id,employee_id,version,provider,responsibilities,goal,created_at',business_rules:'id,category,title,version,body,created_at',projects:'id,name,status,created_at',portfolios:'id,title,summary,materials,is_demo,created_at',media_files:'id,original_name,mime_type,byte_size,metadata_json',tasks:'id,title,portfolio_id,employee_id,status,provider,model,result_version,result,created_at',approvals:'id,task_id,decision,result_version,comment,created_at',channel_posts:'id,task_id,channel,revision,status,title,body,photos_json,posted_url,created_at',channel_post_reviews:'id,post_id,revision,decision,comment,created_at',post_rewrites:'id,post_id,source_revision,result_revision,status,provider,model,rejection_comment,error_code,created_at'};
 const tables=Object.fromEntries(Object.entries(specs).map(([table,columns])=>[table,{count:db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n,rows:db.prepare(`SELECT ${columns} FROM ${table} ORDER BY created_at DESC LIMIT 100`).all()}]));return send(200,{queried_at:new Date().toISOString(),tables});
 }
 if(path==='/api/ai/status')return send(200,aiStatus());
 if(path==='/api/portfolios')return send(200,listPortfolios(db));
 if(path==='/api/tasks')return send(200,listTasks(db));
 if(path==='/api/projects')return send(200,db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all());
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
 const upload=path.match(/^\/api\/portfolios\/([a-zA-Z0-9-]+)\/media$/);if(upload){const chunks:Buffer[]=[];let size=0;for await(const c of req){size+=c.length;if(size>8*1024*1024)return send(413,{error:'IMAGE_TOO_LARGE'});chunks.push(c);}return send(201,uploadMedia(db,upload[1],url.searchParams.get('name')||'photo',Buffer.concat(chunks),options.mediaRoot));}
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON_REQUIRED'});
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)return send(413,{error:'BODY_TOO_LARGE'});}
 let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'INVALID_JSON'});}
 const split=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/posts$/);if(split)return send(200,splitPosts(db,split[1]));
 if(path==='/api/control/stop'){if(!options.controlToken||body?.token!==options.controlToken)return send(403,{error:'DENIED'});send(200,{stopping:true});setTimeout(()=>options.onStop?.(),100);return;}
 const rewrite=path.match(/^\/api\/posts\/([a-zA-Z0-9-]+)\/rewrite$/);if(rewrite)return send(200,await rewritePost(db,rewrite[1],body));
 const post=path.match(/^\/api\/posts\/([a-zA-Z0-9-]+)\/(save|review|posted)$/);if(post)return send(200,post[2]==='save'?updatePost(db,post[1],body):post[2]==='review'?reviewPost(db,post[1],body):markPosted(db,post[1],body));
 if(path==='/api/portfolios/demo')return send(200,seedDemoPortfolios(db));
 if(path==='/api/portfolios')return send(201,createPortfolio(db,body));
 const marketing=path.match(/^\/api\/portfolios\/([a-zA-Z0-9-]+)\/generate$/);if(marketing)return send(200,await generatePortfolio(db,marketing[1],body));
 if(path==='/api/tasks')return send(200,await runTask(db,body));
 const approval=path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/approvals$/);if(approval)return send(201,decideTask(db,approval[1],body));
 if(path==='/api/projects'){if(!body||typeof body.name!=='string'||!body.name.trim()||body.name.length>70||typeof body.detail!=='string'||body.detail.length>350)return send(400,{error:'INVALID_FIELDS'});const id=randomUUID();db.prepare('INSERT INTO projects(id,name,site_summary) VALUES (?,?,?)').run(id,body.name.trim(),body.detail);return send(201,db.prepare('SELECT * FROM projects WHERE id=?').get(id));}
 if(path==='/api/settings')return send(200,saveSettings(db,body));
 if(!body||typeof body!=='object'||!Number.isSafeInteger(body.expected_version)||body.expected_version<0)return send(400,{error:'EXPECTED_VERSION_REQUIRED'});
 const role=path.match(/^\/api\/employees\/([^/]+)\/roles$/);if(role)return send(201,appendRole(db,role[1],body.expected_version,body));
 const rule=path.match(/^\/api\/rules\/([a-z0-9_-]{1,80})$/);if(rule)return send(201,appendRule(db,rule[1],body.expected_version,body));
 }
 send(404,{error:'NOT_FOUND'});
 }catch(e){const m=e instanceof Error?e.message:'';const allowed=['VERSION_CONFLICT','CLAUDE_NOT_CONFIGURED','SELECT_CLAUDE_FOR_EMPLOYEE','TASK_NOT_FOUND','PROMPT_TOO_LARGE','PORTFOLIO_NOT_FOUND','AI_BUSY','GEMINI_NOT_CONFIGURED','SELECT_GEMINI_FOR_EMPLOYEE','APPROVAL_REQUIRED','CHANNEL_SPLIT_FAILED','POSTS_NOT_AVAILABLE','INVALID_IMAGE','IMAGE_TOO_LARGE','INVALID_MEDIA','REJECTION_REQUIRED','INVALID_BACKUP','INCOMPATIBLE_BACKUP','MISSING_MEDIA','MEDIA_HASH_MISMATCH','BACKUP_TOO_LARGE','RESTORE_TARGET_EXISTS'];send(m==='VERSION_CONFLICT'?409:(m==='CLAUDE_NOT_CONFIGURED'||m==='GEMINI_NOT_CONFIGURED')?503:m==='TASK_NOT_FOUND'?404:400,{error:allowed.includes(m)?m:'INVALID_REQUEST'});}
 });}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=initialize();db.exec("UPDATE tasks SET status='failed',error_code='SERVER_RESTARTED' WHERE status='running'");db.exec("UPDATE post_rewrites SET status='failed',error_code='SERVER_RESTARTED',completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE status='running'");const port=Number(process.env.PIXFFICE_PORT||4313),token=randomUUID(),runtimeFile=resolve(root,'.runtime/server.json');
 const stop=()=>server.close(()=>{db.close();try{if(JSON.parse(readFileSync(runtimeFile,'utf8')).token===token)unlinkSync(runtimeFile);}catch{}process.exit(0);});
 const server=makeServer(db,{controlToken:token,onStop:stop});server.listen(port,'127.0.0.1',()=>{mkdirSync(resolve(root,'.runtime'),{recursive:true,mode:0o700});writeFileSync(runtimeFile,JSON.stringify({pid:process.pid,port,token}),{mode:0o600});console.log('로컬 화면: http://127.0.0.1:'+port);});for(const sig of ['SIGINT','SIGTERM'] as const)process.on(sig,stop);}
