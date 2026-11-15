import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {initialize} from '../db.ts';
import {seedDemoPortfolios} from '../portfolios.ts';
import {makeServer} from '../server.ts';
test('HTTP upload, channel save/review/export with ZIP integrity and safe HTML',async()=>{
 const db=initialize(':memory:'),root=mkdtempSync(join(tmpdir(),'channel-http-')),server=makeServer(db,{mediaRoot:root});
 const request=(url:string,body?:unknown,raw?:Buffer)=>new Promise<any>(resolve=>{const req=Readable.from([raw||Buffer.from(body?JSON.stringify(body):'')]) as any;req.url=url;req.method=body||raw?'POST':'GET';req.headers={host:'127.0.0.1:4313','content-type':raw?'image/png':'application/json'};let status=200,headers:any={};server.emit('request',req,{writeHead:(s:number,h:any)=>{status=s;headers=h;},end:(value:any)=>{const bytes=Buffer.isBuffer(value)?value:Buffer.from(value||'');resolve({status,headers,bytes,json:()=>JSON.parse(bytes.toString())});}});});
 try{seedDemoPortfolios(db);db.prepare("INSERT INTO tasks(id,employee_id,title,portfolio_id,status,result,result_version) VALUES ('http-task','design','가상 검증','demo-wood31','review',?,1)").run('[Instagram]\n가상 인스타\n[블로그]\n가상 블로그\n[Threads]\n가상 쓰레드');
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII=','base64');
 const upload=await request('/api/portfolios/demo-wood31/media?name=test.png',undefined,image);assert.equal(upload.status,201);const media=upload.json();assert.deepEqual((await request('/api/media/'+media.id)).bytes,image);
 let posts=(await request('/api/tasks/http-task/posts',{})).json();const id=posts.find((p:any)=>p.channel==='blog').id;
 assert.equal((await request('/api/posts/'+id+'/export')).status,400);
 posts=(await request('/api/posts/'+id+'/save',{revision:1,title:'가상 제목',body:'원고 [사진 1] <script>alert(1)</script>',hashtags:'#테스트',photos:[{media_id:media.id,caption:'검증용 사진'}]})).json();
 assert.equal((await request('/api/posts/'+id+'/review',{revision:2,decision:'approved',comment:'검증'})).status,200);
 const archive=await request('/api/posts/'+id+'/export');assert.equal(archive.status,200);assert.equal(archive.headers['Content-Type'],'application/zip');
 writeFileSync(join(root,'export.zip'),archive.bytes);const check=spawnSync('python3',['-c',"import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert 'photos/01.png' in z.namelist();h=z.read('post.html').decode();assert '<script>' not in h;assert '&lt;script&gt;' in h;assert '<figure>' in h;print('ZIP integrity OK')",join(root,'export.zip')],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
 assert.equal((await request('/api/posts/'+id+'/save',{revision:2,title:'수정',body:'다시 검토',hashtags:'',photos:[]})).status,200);assert.equal((await request('/api/posts/'+id+'/export')).status,400);
 }finally{db.close();rmSync(root,{recursive:true,force:true});}
});
