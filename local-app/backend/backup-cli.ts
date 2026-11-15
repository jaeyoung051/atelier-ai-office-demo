import {initialize,root} from './db.ts';
import {fullBackup,restoreFull} from './full-backup.ts';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const command=process.argv[2];
if(command==='restore'){if(!process.argv[3])throw Error('백업 ZIP 경로가 필요합니다.');const target=resolve(process.argv[4]||resolve(root,'restores','recovered-'+Date.now()));const result=restoreFull(readFileSync(resolve(process.argv[3])),target);console.log('새 폴더에 복원 완료:',result.directory);if(process.argv.includes('--activate')){writeFileSync(resolve(root,'local-data.json'),JSON.stringify({databasePath:result.database},null,2),{mode:0o600});console.log('다음 실행부터 복원본을 사용합니다. 서버를 다시 실행하세요.');}}
else{const target=resolve(process.argv[3]||resolve(root,'backups','pixffice-full-'+Date.now()+'.zip'));const db=initialize();try{const bytes=await fullBackup(db);mkdirSync(dirname(target),{recursive:true,mode:0o700});writeFileSync(target,bytes,{mode:0o600,flag:'wx'});console.log('DB + 사진 전체 백업 완료:',target);}finally{db.close();}}
