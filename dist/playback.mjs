import {midiAt} from './music.mjs';

export function playbackPlan(positions,tuning,mode='chord',tempo=110,direction='up'){
  const ordered=positions.map(p=>({...p,midi:midiAt(tuning,p.string,p.fret)}));
  if(mode==='arpeggio'&&direction!=='selection'){
    ordered.sort((a,b)=>a.midi-b.midi||b.string-a.string||a.fret-b.fret);
    if(direction==='down')ordered.reverse();
  }
  const interval=30000/Math.max(40,Math.min(240,Number(tempo)||110));
  return ordered.map((p,i)=>({...p,delay:mode==='arpeggio'?i*interval:0}));
}
