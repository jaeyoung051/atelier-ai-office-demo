import {spawn} from 'node:child_process';
import {existsSync,readFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {resolve} from 'node:path';
import {root} from '../backend/db.ts';
const runtime=resolve(root,'.runtime/server.json'),command=process.argv[2];
const sleep=(n:number)=>new Promise(r=>setTimeout(r,n));
if(command==='stop'){
 if(!existsSync(runtime)){console.log('관리 중인 실행 서버가 없습니다. 직접 실행한 터미널은 Ctrl+C로 종료하세요.');process.exit(0);}
 const meta=JSON.parse(readFileSync(runtime,'utf8'));const res=await fetch(`http://127.0.0.1:${meta.port}/api/control/stop`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:meta.token}),signal:AbortSignal.timeout(3000)}).catch(()=>null);
 if(!res?.ok)throw Error('서버 종료를 확인하지 못했습니다. 실행 터미널에서 Ctrl+C를 누르세요.');for(let i=0;i<50&&existsSync(runtime);i++)await sleep(100);if(existsSync(runtime))throw Error('서버 종료 대기 시간이 초과되었습니다.');console.log('Pixffice를 종료했습니다.');
}else{
 const version=process.versions.node.split('.').map(Number);if(version[0]!==22||version[1]<20)throw Error('Node.js 22.20.x가 필요합니다.');
 if(!existsSync(resolve(root,'node_modules/exceljs'))||!existsSync(resolve(root,'node_modules/pptxgenjs')))throw Error('최초 실행 전 앱 폴더에서 npm ci를 실행해 엑셀·PPT 구성요소를 설치하세요.');
 const port=Number(process.env.PIXFFICE_PORT||4313),url=`http://127.0.0.1:${port}`;
 const health=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)}).catch(()=>null);
 if(health?.ok){console.log('이미 실행 중입니다:',url);process.exit(0);}
 mkdirSync(resolve(root,'.runtime'),{recursive:true,mode:0o700});const log=openSync(resolve(root,'.runtime/server.log'),'a',0o600);
 const child=spawn(process.execPath,['--env-file-if-exists=.env','--experimental-strip-types','backend/server.ts'],{cwd:root,detached:true,stdio:['ignore',log,log],env:process.env});child.unref();closeSync(log);
 let ready=false;for(let i=0;i<50;i++){await sleep(100);const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)}).catch(()=>null);if(r?.ok){ready=true;break;}}
 if(!ready)throw Error('서버 시작 실패. .runtime/server.log를 확인하세요.');console.log('Pixffice 실행 완료:',url);
}
