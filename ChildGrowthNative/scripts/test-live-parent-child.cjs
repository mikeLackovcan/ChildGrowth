// Explicitly opted-in integration test. Mutates only a uniquely named QA quest.
// Requires an already-linked disposable parent and child. Never use family accounts.
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');
if (process.env.QUESTBLOX_LIVE_TEST !== 'disposable-accounts-only') throw Error('Set QUESTBLOX_LIVE_TEST=disposable-accounts-only and provide dedicated QA account credentials.');
for (const name of ['QUESTBLOX_QA_PARENT_EMAIL', 'QUESTBLOX_QA_CHILD_EMAIL', 'QUESTBLOX_QA_PASSWORD']) if (!process.env[name]) throw Error(`Missing ${name}`);
const config = fs.readFileSync(path.join(__dirname, '../src/lib/firebase.ts'), 'utf8');
const key = config.match(/apiKey: "([^"]+)"/)[1];
async function json(url, data, token) {
 const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? {authorization:`Bearer ${token}`} : {}) }, body: JSON.stringify(data) });
 const body = await response.json(); if (!response.ok || body.error) throw Error(body.error?.message || `HTTP_${response.status}`); return body;
}
async function signin(kind) {
 const r = await json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, { email: process.env[kind === 'parent' ? 'QUESTBLOX_QA_PARENT_EMAIL' : 'QUESTBLOX_QA_CHILD_EMAIL'], password: process.env.QUESTBLOX_QA_PASSWORD, returnSecureToken: true });
 return {uid:r.localId,token:r.idToken};
}
const call = async (user, name, data={}) => (await json(`https://europe-west1-questblox-10c14.cloudfunctions.net/${name}`,{data},user.token)).result;

(async()=>{
 const parent=await signin('parent'), child=await signin('kid');
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const base=Date.now().toString(36), id=`sync-check-${base}`; let sequence=0, revision=0, created=false;
 const op=(actor,action,payload,requestId)=>call(actor,'applyProgress',{targetUid:child.uid,requestId:requestId || `qa-${base}-${++sequence}`,timeZone:'Europe/Prague',day,action,payload});
 const decode=v=>v.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)])):v.arrayValue?(v.arrayValue.values||[]).map(decode):v.integerValue!==undefined?Number(v.integerValue):v.booleanValue!==undefined?v.booleanValue:v.stringValue??v.doubleValue??null;
 const read=async(actor)=>{const r=await fetch(`https://firestore.googleapis.com/v1/projects/questblox-10c14/databases/(default)/documents/user_data/${child.uid}`,{headers:{authorization:`Bearer ${actor.token}`}});assert.equal(r.status,200);return decode({mapValue:await r.json()});};
 try {
 await op(parent,'task.create',{id,name:'QA temporary reading',icon:'📚',freq:'daily',diff:'easy',requiresApproval:false});created=true;
 assert.equal((await read(child)).tasks.find(t=>t.id===id).name,'QA temporary reading');console.log('PASS: parent-created task readable by child');
 await op(parent,'task.update',{id,expectedRevision:0,nextRevision:`edit-${base}`,changes:{name:'QA edited reading',reminderTime:'00:15',reminderMode:'alarm'}});revision=`edit-${base}`;
 const edited=(await read(child)).tasks.find(t=>t.id===id);assert.equal(edited.name,'QA edited reading');assert.equal(edited.reminderTime,'00:15');console.log('PASS: parent edit and midnight alarm configuration reach child');
 const receipt=`qa-${base}-complete`;const completed=await op(parent,'task.complete',{id,expectedRevision:revision},receipt);
 assert.equal((await read(child)).tasks.find(t=>t.id===id).done,true);console.log('PASS: parent completion visible in child cloud document');
 const retry=await op(parent,'task.complete',{id,expectedRevision:revision},receipt);assert.equal(retry.profile.coins,completed.profile.coins);
 const repeated=await op(child,'task.complete',{id,expectedRevision:revision});assert.equal(repeated.profile.coins,completed.profile.coins);console.log('PASS: lost-response retry and later child completion do not duplicate reward');
 await op(parent,'task.undo',{id});assert.equal((await read(child)).tasks.find(t=>t.id===id).done,false);console.log('PASS: parent undo visible to child');
 await op(parent,'task.update',{id,expectedRevision:revision,nextRevision:`approval-${base}`,changes:{requiresApproval:true}});revision=`approval-${base}`;
 const submitted=await op(child,'task.complete',{id,expectedRevision:revision});const task=submitted.data.tasks.find(t=>t.id===id);assert.equal(task.pendingApproval,true);
 assert.equal((await read(parent)).tasks.find(t=>t.id===id).pendingApproval,true);console.log('PASS: child submission visible to parent');
 const approved=await op(parent,'task.review',{id,submissionId:task.pendingSubmissionId,approved:true});assert.equal((await read(child)).tasks.find(t=>t.id===id).done,true);
 const reapproved=await op(parent,'task.review',{id,submissionId:task.pendingSubmissionId,approved:true});assert.equal(reapproved.profile.coins,approved.profile.coins);console.log('PASS: approval reaches child and repeated approval pays once');
 await op(parent,'task.undo',{id});
 } finally {if(created){await op(parent,'task.delete',{id,expectedRevision:revision});assert.equal((await read(child)).tasks.some(t=>t.id===id),false);console.log('PASS: parent deletion reaches child; temporary quest removed');}}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
