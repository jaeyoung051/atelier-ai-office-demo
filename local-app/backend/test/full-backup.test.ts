import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {initialize} from '../db.ts';
import {seedDemoPortfolios} from '../portfolios.ts';
import {uploadMedia,readMedia} from '../media.ts';
import {fullBackup,restoreFull} from '../full-backup.ts';
import {zipFiles} from '../zip.ts';
test('full snapshot+media restore, current data untouched, corruption/traversal rejected',async()=>{
 const temp=mkdtempSync(resolve(tmpdir(),'pixffice-full-test-')),source=resolve(temp,'source-media'),db=initialize(':memory:');try{
 seedDemoPortfolios(db);const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII=','base64');const m=uploadMedia(db,'demo-wood31','가상 테스트.png',bytes,source)!;
 db.exec("INSERT INTO projects(id,name) VALUES ('backup-test','백업 원본')");const archive=await fullBackup(db,source);assert.ok(!archive.includes(Buffer.from('ANTHROPIC_API_KEY')));const target=resolve(temp,'restored');const result=restoreFull(archive,target);assert.equal(result.mediaCount,1);
 const restored=new DatabaseSync(result.database,{readOnly:true});try{assert.equal(restored.prepare('SELECT name FROM projects WHERE id=?').get('backup-test')!.name,'백업 원본');assert.deepEqual(readMedia(restored,String(m.id),resolve(target,'media')).bytes,bytes);}finally{restored.close();}
 assert.equal(db.prepare('SELECT name FROM projects WHERE id=?').get('backup-test')!.name,'백업 원본');assert.throws(()=>restoreFull(archive,target),/RESTORE_TARGET_EXISTS/);
 const damaged=Buffer.from(archive);damaged[200]^=1;assert.throws(()=>restoreFull(damaged,resolve(temp,'damaged')),/INVALID_BACKUP/);assert.equal(existsSync(resolve(temp,'damaged')),false);
 const traversal=zipFiles([{name:'../.env',bytes:Buffer.from('unsafe')},{name:'manifest.json',bytes:Buffer.from('{}')},{name:'database.sqlite',bytes:Buffer.from('bad')}]);assert.throws(()=>restoreFull(traversal,resolve(temp,'traversal')),/INVALID_BACKUP/);
 db.exec("INSERT INTO tasks(id,employee_id,title,status) VALUES ('busy','design','실행중','running')");await assert.rejects(fullBackup(db,source),/AI_BUSY/);
 }finally{db.close();rmSync(temp,{recursive:true,force:true});}
});
