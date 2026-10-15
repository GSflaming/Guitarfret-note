import test from 'node:test';import assert from 'node:assert/strict';
import {handleRequest,RecognitionGate} from '../worker/index.mjs';
test('retired recognition endpoints cannot invoke jobs or AI, while the base app still serves assets',async()=>{
 let assets=0;
 const env={ASSETS:{fetch(){assets++;return new Response('fretboard');}}};
 for(const name of ['AI','RECOGNITION_GATE'])Object.defineProperty(env,name,{get(){throw Error('retired capability accessed');}});
 for(const path of ['/api/config','/api/jobs','/api/recognize','/score/pdf-ui.js','/local-demo/hotel.json','/samples/solo-tab.pdf','/vendor/pdfjs/pdf.mjs']){
  const response=await handleRequest(new Request('https://example.test'+path,{method:'POST',body:'{}'}),env);assert.equal(response.status,410);assert.equal((await response.json()).error.code,'FEATURE_PAUSED');
 }
 assert.equal(assets,0);assert.equal(await (await handleRequest(new Request('https://example.test/'),env)).text(),'fretboard');assert.equal(assets,1);
});
test('the retained namespace clears scheduled alarms without erasing stored jobs',async()=>{
 let alarms=0;const storage={async deleteAlarm(){alarms++;},async deleteAll(){throw Error('must preserve data');}};
 const gate=new RecognitionGate({storage});await gate.alarm();assert.equal((await gate.fetch()).status,410);assert.equal(alarms,2);
});
