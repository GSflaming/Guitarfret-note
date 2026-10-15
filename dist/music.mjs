export const SHARP = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const FLAT = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
export const PRESETS = {
  standard:{name:'STANDARD',notes:[40,45,50,55,59,64]},
  dropd:{name:'DROP D',notes:[38,45,50,55,59,64]},
  dadgad:{name:'DADGAD',notes:[38,45,50,55,57,62]},
  facgce:{name:'FACGCE',notes:[41,45,48,55,60,64]},
  daeacsharp:{name:'DAEAC♯E',notes:[38,45,52,57,61,64]},
  opend:{name:'OPEN D',notes:[38,45,50,54,57,62]},
  openg:{name:'OPEN G',notes:[38,43,50,55,59,62]},
  halfstep:{name:'HALF STEP DOWN',notes:[39,44,49,54,58,63]}
};
export function parsePitch(value, requireOctave = true) {
  const match = String(value).trim().replaceAll('♯','#').replaceAll('♭','b').match(/^([a-gA-G])([#b]?)(-?\d)?$/);
  if (!match || (requireOctave && match[3] === undefined)) throw new Error('请输入带八度的音名，例如 E2、F#2、Bb3。');
  const base = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[match[1].toUpperCase()];
  const pitch = base + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
  if (match[3] === undefined) return {pc:(pitch+12)%12,midi:null};
  const midi = (Number(match[3])+1)*12+pitch;
  if(midi<24 || midi>88) throw new Error('音高范围为 C1—E6，请检查八度。');
  return {pc:(midi+12)%12,midi};
}
export function noteName(midi, flats=false){return (flats?FLAT:SHARP)[(midi%12+12)%12];}
export function octave(midi){return Math.floor(midi/12)-1;}
export function fullName(midi,flats=false){return noteName(midi,flats)+octave(midi);}
export function frequency(midi){return 440*Math.pow(2,(midi-69)/12);}
export function midiAt(tuning, string, fret){return tuning[6-string]+fret;}
export function fretX(fret){return 1-Math.pow(2,-fret/12);}
export function noteX(fret){return fret===0?-.029:(fretX(fret-1)+fretX(fret))/2;}
export function rangeCamera(start,end){const left=start<=1?0:fretX(start-1)-.009;return {left,right:fretX(end)+.014};}
export function parsePositions(value){
  const input=String(value).trim();
  if(!input) throw new Error('先输入一个弦／品位置。');
  const tokens=input.split(/[\s,，;；]+/).filter(Boolean);
  let positions;
  if(tokens.length===6 && tokens.every(t=>/^(\d{1,2}|x)$/i.test(t))) positions=tokens.flatMap((t,i)=>/^x$/i.test(t)?[]:[{string:6-i,fret:Number(t)}]);
  else positions=tokens.map(token=>{const m=token.match(/^([1-6])[:：/](\d{1,2})$/);if(!m)throw new Error('使用「弦:品」，例如 6:0 5:2；也支持六弦至一弦：x 3 2 0 1 0。');return {string:Number(m[1]),fret:Number(m[2])};});
  if(!positions.length)throw new Error('至少需要一个发声音符。');
  if(positions.some(p=>p.fret>24))throw new Error('品位范围为 0—24，0 表示空弦。');
  return [...new Map(positions.map(p=>[p.string+':'+p.fret,p])).values()];
}
export function findNotes(value,tuning,start,end){
  const tokens=String(value).trim().split(/[\s,，;；]+/).filter(Boolean);
  if(!tokens.length)throw new Error('输入音名，例如 C、F# 或 E4。');
  const queries=tokens.map(t=>parsePitch(t,false));
  const positions=[];
  for(let string=1;string<=6;string++)for(let fret=start;fret<=end;fret++){
    const midi=midiAt(tuning,string,fret);
    if(queries.some(q=>q.midi===null?q.pc===midi%12:q.midi===midi))positions.push({string,fret});
  }
  if(!positions.length)throw new Error('当前镜头内没有这个音。试试扩大品位范围，或去掉八度。');
  return positions;
}
