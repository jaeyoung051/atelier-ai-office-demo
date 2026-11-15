import { initialize, defaultPath, backupDatabase, root } from './db.ts';
import { resolve } from 'node:path';
const db=initialize();try{if(process.argv[2]==='backup'){const target=resolve(process.argv[3]||resolve(root,'backups',`pixffice-${Date.now()}.sqlite`));if(target===defaultPath)throw Error('Backup target must differ');await backupDatabase(db,target);console.log('백업 검증 완료:',target);}else console.log('DB 준비 완료:',defaultPath,db.prepare('SELECT count(*) AS employees FROM ai_employees').get(),db.prepare('SELECT count(*) AS rules FROM business_rules').get());}finally{db.close();}
