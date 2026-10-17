import {translate} from './i18n.mjs';
import {noteName} from './music.mjs';

// Match pitch classes exactly; octave doublings do not change a chord's name.
const TYPES = [
  ['', '大三和弦', [0,4,7]], ['m', '小三和弦', [0,3,7]],
  ['5', '五度和弦', [0,7]], ['dim', '减三和弦', [0,3,6]], ['aug', '增三和弦', [0,4,8]],
  ['sus2', '挂二和弦', [0,2,7]], ['sus4', '挂四和弦', [0,5,7]],
  ['6', '大六和弦', [0,4,7,9]], ['m6', '小六和弦', [0,3,7,9]],
  ['7', '属七和弦', [0,4,7,10]], ['maj7', '大七和弦', [0,4,7,11]],
  ['m7', '小七和弦', [0,3,7,10]], ['m(maj7)', '小大七和弦', [0,3,7,11]],
  ['m7♭5', '半减七和弦', [0,3,6,10]], ['dim7', '减七和弦', [0,3,6,9]],
  ['7sus4', '属七挂四和弦', [0,5,7,10]], ['7sus2', '属七挂二和弦', [0,2,7,10]],
  ['maj7sus2', '大七挂二和弦', [0,2,7,11]], ['maj7sus4', '大七挂四和弦', [0,5,7,11]],
  ['add9', '加九和弦', [0,2,4,7]], ['madd9', '小加九和弦', [0,2,3,7]],
  ['add11', '加十一和弦', [0,4,5,7]], ['madd11', '小加十一和弦', [0,3,5,7]],
  ['6/9', '六九和弦', [0,2,4,7,9]], ['m6/9', '小六九和弦', [0,2,3,7,9]],
  ['9', '属九和弦', [0,2,4,7,10]], ['maj9', '大九和弦', [0,2,4,7,11]], ['m9', '小九和弦', [0,2,3,7,10]],
  ['9sus4', '九挂四和弦', [0,2,5,7,10]],
  ['7add11', '属七加十一和弦', [0,4,5,7,10]], ['m7add11', '小七加十一和弦', [0,3,5,7,10]],
  ['maj7add11', '大七加十一和弦', [0,4,5,7,11]],
  ['11', '属十一和弦', [0,2,4,5,7,10]], ['m11', '小十一和弦', [0,2,3,5,7,10]], ['maj11', '大十一和弦', [0,2,4,5,7,11]],
  ['13', '属十三和弦', [0,2,4,7,9,10]], ['maj13', '大十三和弦', [0,2,4,7,9,11]], ['m13', '小十三和弦', [0,2,3,7,9,10]],
  ['7♭5', '属七降五和弦', [0,4,6,10]], ['7♯5', '属七升五和弦', [0,4,8,10]], ['maj7♯5', '大七升五和弦', [0,4,8,11]],
  ['7♭9', '属七降九和弦', [0,1,4,7,10]], ['7♯9', '属七升九和弦', [0,3,4,7,10]],
  ['maj7♯11', '大七升十一和弦', [0,4,6,7,11]], ['maj9♯11', '大九升十一和弦', [0,2,4,6,7,11]],
];
const pc=n=>(n%12+12)%12;
const same=(a,b)=>a.length===b.length&&a.every(n=>b.includes(n));

export function identifyChord(midis,language='zh'){
  const t=(text,values)=>translate(text,language,values);
  const notes=midis.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!notes.length)return {kind:'empty',symbol:'',description:t('选择音符后自动识别和弦。'),alternatives:[],notes:[]};
  const classes=[...new Set(notes.map(pc))],bass=pc(notes[0]),names=classes.map(n=>noteName(n));
  if(classes.length===1)return {kind:'single',symbol:names[0],description:t('单音'),alternatives:[],notes:names};
  const matches=[];
  for(const root of classes){
    const intervals=classes.map(n=>pc(n-root));
    TYPES.forEach(([suffix,description,formula],index)=>{
      const omittedFifth=formula.length>=4&&formula.includes(7)&&same(intervals,formula.filter(n=>n!==7));
      if(!same(intervals,formula)&&!omittedFifth)return;
      const flats=[3,5,8,10].includes(root),rootName=noteName(root,flats),bassName=noteName(bass,flats);
      const symbol=rootName+suffix+(omittedFifth?'(no5)':'')+(bass===root?'':'/'+bassName);
      // Prefer complete voicings and a root in the bass; retain other valid readings.
      const score=(omittedFifth?30:0)+(bass===root?0:8)+index*.01;
      matches.push({symbol,description:rootName+' '+t(description)+(omittedFifth?t(' · 省略五音'):'')+(bass===root?'':t(' · {bass} 低音',{bass:bassName})),score});
    });
  }
  matches.sort((a,b)=>a.score-b.score);
  if(!matches.length)return {kind:'collection',symbol:names.join(' · '),description:t(classes.length===2?'双音；尚不足以确定和弦。':'音集合；未匹配到常见和弦。'),alternatives:[],notes:names};
  return {kind:'chord',symbol:matches[0].symbol,description:matches[0].description,alternatives:[...new Set(matches.slice(1).map(m=>m.symbol))].slice(0,3),notes:names};
}
