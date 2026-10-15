import {readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const files=['index.html','styles.css','app.js','music.mjs','view.mjs','chords.mjs','playback.mjs','tools.mjs','notice.mjs','shortcuts.mjs'];
for(const file of files)await access(resolve('dist',file));
for(const file of files.filter(f=>/\.m?js$/.test(f)).map(f=>'dist/'+f).concat('worker/index.mjs')){
 const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status)process.exit(result.status);
}
const html=await readFile('dist/index.html','utf8');
for(const [,url] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
 if(/^(?:data:|https?:|#)/.test(url))continue;
 await access(resolve('dist',url.split('?')[0]));
}
console.log('Pure fretboard: static assets and module syntax verified.');
