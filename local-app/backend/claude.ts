export function claudeStatus(env=process.env){return {provider:'Claude',keyConfigured:!!env.ANTHROPIC_API_KEY,model:env.PIXFFICE_CLAUDE_MODEL||null,ready:!!(env.ANTHROPIC_API_KEY&&env.PIXFFICE_CLAUDE_MODEL)};}
export async function generateClaude(system:string,input:string,options:{env?:NodeJS.ProcessEnv;fetcher?:typeof fetch}={}){
 const env=options.env||process.env; if(!claudeStatus(env).ready)throw Error('CLAUDE_NOT_CONFIGURED');
 const res=await (options.fetcher||fetch)('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':env.ANTHROPIC_API_KEY!,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:env.PIXFFICE_CLAUDE_MODEL,max_tokens:2048,system,messages:[{role:'user',content:input}]}),signal:AbortSignal.timeout(90000)});
 if(!res.ok){await res.body?.cancel();throw Error(res.status===401?'CLAUDE_AUTH_FAILED':res.status===429?'CLAUDE_RATE_LIMIT':res.status===402?'CLAUDE_BILLING_REQUIRED':'CLAUDE_REQUEST_FAILED');}
 const data=await res.json();if(data.stop_reason!=='end_turn')throw Error('CLAUDE_INCOMPLETE_RESULT');
 const text=(data.content||[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('\n').trim();if(!text||text.length>100000)throw Error('CLAUDE_EMPTY_OR_OVERSIZE');return text;
}
