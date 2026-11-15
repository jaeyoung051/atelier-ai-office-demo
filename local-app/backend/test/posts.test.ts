import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initialize} from '../db.ts';
import {seedDemoPortfolios} from '../portfolios.ts';
import {uploadMedia,readMedia} from '../media.ts';
import {splitPosts,updatePost,reviewPost,markPosted,exportPost} from '../posts.ts';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII=','base64');
test('photo bytes and per-channel revision, review, export, posted record, re-review',()=>{
 const db=initialize(':memory:'),root=mkdtempSync(join(tmpdir(),'post-photos-'));try{
 seedDemoPortfolios(db);const media=uploadMedia(db,'demo-wood31','테스트 사진.png',png,root)!;assert.deepEqual(readMedia(db,String(media.id),root).bytes,png);assert.throws(()=>uploadMedia(db,'demo-wood31','evil.svg',Buffer.from('<svg/>'),root),/INVALID_IMAGE/);
 db.prepare("INSERT INTO tasks(id,employee_id,title,portfolio_id,status,result,result_version) VALUES ('posts-test','design','가상 테스트','demo-wood31','review',?,1)").run('[Instagram]\n인스타 초안\n[블로그]\n블로그 제목\n본문 [사진 1]\n[Threads]\n쓰레드 초안');
 let posts=splitPosts(db,'posts-test');assert.equal(posts.length,3);assert.equal(splitPosts(db,'posts-test').length,3);let p=posts.find(p=>p.channel==='blog')!;
 assert.throws(()=>exportPost(db,String(p.id),root),/APPROVAL_REQUIRED/);
 posts=updatePost(db,String(p.id),{revision:p.revision,title:'테스트 제목',body:'가상 블로그 [사진 1] <script>alert(1)</script>',hashtags:'#테스트',photos:[{media_id:media.id,caption:'가상 사진 설명'}]});p=posts.find(x=>x.id===p.id)!;assert.equal(p.revision,2);assert.equal(p.status,'review');
 assert.throws(()=>reviewPost(db,String(p.id),{revision:1,decision:'approved',comment:''}),/VERSION_CONFLICT/);
 posts=reviewPost(db,String(p.id),{revision:2,decision:'approved',comment:'테스트 승인'});assert.equal(posts.find(x=>x.channel==='instagram')!.status,'review');
 const archive=exportPost(db,String(p.id),root);assert.equal(archive.bytes.readUInt32LE(0),0x04034b50);assert.ok(archive.text.includes('가상 사진 설명'));writeFileSync(join(root,'test.zip'),archive.bytes);
 assert.throws(()=>markPosted(db,String(p.id),{revision:2,url:'https://evil.example/post'}),/INVALID_FIELDS/);assert.equal(markPosted(db,String(p.id),{revision:2,url:'https://blog.naver.com/test/123'}).find(x=>x.id===p.id)!.status,'posted');
 posts=updatePost(db,String(p.id),{revision:2,title:'새 제목',body:'수정 원고',hashtags:'',photos:[]});p=posts.find(x=>x.id===p.id)!;assert.equal(p.revision,3);assert.equal(p.status,'review');assert.equal(p.posted_url,null);assert.equal(p.reviews.length,1);assert.throws(()=>exportPost(db,String(p.id),root),/APPROVAL_REQUIRED/);
 assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.close();rmSync(root,{recursive:true,force:true});}
});
