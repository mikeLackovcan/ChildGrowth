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
 const parent=await signin('parent'),child=await signin('kid');
 const original=await call(child,'getFamilyStatus'); const code=original.connection_code;const tag=original.linked_parents[0];assert.ok(tag);
 const invite=()=>call(parent,'manageFamily',{action:'invite',connectionCode:code});
 const respond=action=>call(child,'manageFamily',{action,otherTag:tag});
 const wait=()=>new Promise(r=>setTimeout(r,61000));
 const canRead=async()=> (await fetch(`https://firestore.googleapis.com/v1/projects/questblox-10c14/databases/(default)/documents/user_data/${child.uid}`,{headers:{authorization:`Bearer ${parent.token}`}})).status;
 let restored=false;
 try{
 await assert.rejects(()=>call(parent,'manageFamily',{action:'invite',connectionCode:'bad'}),/INVALID_FAMILY_CODE/);console.log('PASS: malformed code rejected');
 await respond('unlink'); assert.equal(await canRead(),403);console.log('PASS: unlink removes parent read access');
 await wait();assert.equal((await invite()).status,'pending');
 const pending=await call(child,'getFamilyStatus');assert.equal(pending.pending_invitation.nickname,tag);assert.equal(pending.pending_invitation.sentByMe,false);assert.equal(await canRead(),403);console.log('PASS: invitation identifies parent and grants no task access before child consent');
 await assert.rejects(()=>call(parent,'manageFamily',{action:'accept',otherTag:process.env.QUESTBLOX_QA_CHILD_EMAIL}),/INVITATION_NOT_AVAILABLE/);console.log('PASS: parent cannot accept own invitation');
 await respond('decline');assert.equal((await call(child,'getFamilyStatus')).approval_status,null);assert.equal(await canRead(),403);console.log('PASS: child decline keeps access blocked');
 await wait();await invite();await respond('accept');restored=true;
 assert.equal((await call(child,'getFamilyStatus')).approval_status,'approved');assert.equal(await canRead(),200);console.log('PASS: child acceptance restores parent access and connected state');
 }finally{if(!restored){await wait();await invite();await respond('accept');console.log('Restored original disposable family link');}}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
