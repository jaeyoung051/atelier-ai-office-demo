import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,unlinkSync,readFileSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {defaultPath,transaction} from './db.ts';
export const mediaRoot=resolve(dirname(defaultPath),'media');
export function imageType(bytes:Buffer){
 if(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['image/png','png'];
 if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217)return ['image/jpeg','jpg'];
 if(bytes.length>=16&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return ['image/webp','webp'];
 throw Error('INVALID_IMAGE');
}
export function uploadMedia(db:DatabaseSync,portfolio:string,name:string,bytes:Buffer,root=mediaRoot){
 if(!db.prepare('SELECT 1 FROM portfolios WHERE id=?').get(portfolio))throw Error('PORTFOLIO_NOT_FOUND');
 if(bytes.length===0||bytes.length>8*1024*1024)throw Error('IMAGE_TOO_LARGE');
 if(typeof name!=='string'||name.length>200)throw Error('INVALID_FIELDS');
 const [mime,ext]=imageType(bytes),id=randomUUID(),path=id+'.'+ext;
 mkdirSync(root,{recursive:true,mode:0o700});writeFileSync(resolve(root,path),bytes,{flag:'wx',mode:0o600});
 try{transaction(db,()=>{db.prepare('INSERT INTO media_files(id,storage_path,original_name,mime_type,byte_size,sha256,metadata_json) VALUES (?,?,?,?,?,?,?)').run(id,path,name.replace(/[\x00-\x1f/\\]/g,'_'),mime,bytes.length,createHash('sha256').update(bytes).digest('hex'),JSON.stringify({file_exists:true,caption:'',local_only:true}));
 db.prepare('INSERT INTO portfolio_media(id,portfolio_id,media_id,sort_order) VALUES (?,?,?,?)').run(randomUUID(),portfolio,id,Number(db.prepare('SELECT count(*) n FROM portfolio_media WHERE portfolio_id=?').get(portfolio)!.n));});
 }catch(e){unlinkSync(resolve(root,path));throw e;}return db.prepare('SELECT id,original_name,mime_type,byte_size FROM media_files WHERE id=?').get(id);
}
export function readMedia(db:DatabaseSync,id:string,root=mediaRoot){const m=db.prepare('SELECT * FROM media_files WHERE id=?').get(id);if(!m||(!String(m.mime_type).startsWith('image/')&&m.mime_type!=='application/pdf'))throw Error('MEDIA_NOT_FOUND');const path=resolve(root,String(m.storage_path));if(!path.startsWith(resolve(root)+sep))throw Error('MEDIA_NOT_FOUND');return {meta:m,bytes:readFileSync(path)};}
