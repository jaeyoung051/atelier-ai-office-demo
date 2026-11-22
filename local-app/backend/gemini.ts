export function geminiStatus(env=process.env){return {provider:'Gemini',keyConfigured:!!env.GEMINI_API_KEY,model:env.PIXFFICE_GEMINI_MODEL||'gemini-3.5-flash-lite',ready:!!env.GEMINI_API_KEY};}
export async function generateGemini(system:string,input:string,options:{env?:NodeJS.ProcessEnv;fetcher?:typeof fetch;attachments?:{mimeType:string;data:string}[]}={}){
 const env=options.env||process.env,status=geminiStatus(env);if(!status.ready)throw Error('GEMINI_NOT_CONFIGURED');
 if(!/^[a-zA-Z0-9._-]+$/.test(status.model))throw Error('GEMINI_INVALID_MODEL');
 const res=await (options.fetcher||fetch)(`https://generativelanguage.googleapis.com/v1beta/models/${status.model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY!},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:input},...(options.attachments||[]).map(f=>({inlineData:{mimeType:f.mimeType,data:f.data}}))]}],generationConfig:options.attachments?{maxOutputTokens:4096,responseMimeType:'application/json'}:{maxOutputTokens:2048}}),signal:AbortSignal.timeout(90000)});
 if(!res.ok){await res.body?.cancel();throw Error(res.status===401||res.status===403?'GEMINI_AUTH_FAILED':res.status===429?'GEMINI_RATE_LIMIT':res.status===404?'GEMINI_MODEL_UNAVAILABLE':'GEMINI_REQUEST_FAILED');}
 const data=await res.json();const candidate=data.candidates?.[0];if(!candidate||data.promptFeedback?.blockReason)throw Error('GEMINI_BLOCKED');
 if(candidate.finishReason!=='STOP')throw Error('GEMINI_INCOMPLETE_RESULT');
 const text=(candidate.content?.parts||[]).filter((p:any)=>typeof p.text==='string'&&!p.thought).map((p:any)=>p.text).join('\n').trim();if(!text||text.length>100000)throw Error('GEMINI_EMPTY_OR_OVERSIZE');return text;
}
