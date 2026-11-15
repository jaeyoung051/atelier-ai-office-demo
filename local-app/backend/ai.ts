import {claudeStatus,generateClaude} from './claude.ts';
import {geminiStatus,generateGemini} from './gemini.ts';
export function aiStatus(env=process.env){return env.PIXFFICE_PROVIDER==='Claude'?claudeStatus(env):geminiStatus(env);}
export function generateAI(system:string,input:string,env=process.env){return aiStatus(env).provider==='Claude'?generateClaude(system,input,{env}):generateGemini(system,input,{env});}
