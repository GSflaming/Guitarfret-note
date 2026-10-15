import test from 'node:test';
import assert from 'node:assert/strict';
import {identifyChord} from '../dist/chords.mjs';
import {playbackPlan} from '../dist/playback.mjs';
import {PRESETS,noteName,parsePositions,midiAt,rangeCamera} from '../dist/music.mjs';

test('recognizes major, minor and seventh chords in all twelve keys',()=>{
  for(let root=48;root<60;root++)for(const [suffix,intervals] of [['',[0,4,7]],['m',[0,3,7]],['7',[0,4,7,10]],['maj7',[0,4,7,11]],['m7',[0,3,7,10]]]){
    const flats=[3,5,8,10].includes(root%12);
    assert.equal(identifyChord(intervals.map(n=>root+n)).symbol,noteName(root,flats)+suffix);
  }
});
test('handles open voicings, octave doublings, inversions and ambiguity',()=>{
  const standard=PRESETS.standard.notes,shape=parsePositions('x 3 2 0 1 0');
  assert.equal(identifyChord(shape.map(p=>midiAt(standard,p.string,p.fret))).symbol,'C');
  assert.equal(identifyChord([52,55,60,64,67]).symbol,'C/E');
  const six=identifyChord([48,52,55,57]);
  assert.equal(six.symbol,'C6');assert.ok(six.alternatives.includes('Am7/C'));
  assert.equal(identifyChord([50,53,60]).symbol,'Dm7(no5)');
});
test('recognizes alternate tuning harmony and common extended chords',()=>{
  assert.equal(identifyChord(PRESETS.facgce.notes).symbol,'Fmaj9');
  assert.equal(identifyChord(PRESETS.dadgad.notes).symbol,'Dsus4');
  assert.equal(identifyChord(PRESETS.opend.notes).symbol,'D');
  assert.equal(identifyChord([48,50,52,55]).symbol,'Cadd9');
  assert.equal(identifyChord([48,50,51,53,55,58]).symbol,'Cm11');
});
test('does not invent chord names for a single note or an unmatched collection',()=>{
  assert.equal(identifyChord([]).kind,'empty');
  assert.equal(identifyChord([40,52,64]).kind,'single');
  assert.equal(identifyChord([48,49,50]).kind,'collection');
  assert.equal(identifyChord([48,52]).kind,'collection');
  assert.equal(identifyChord([48,55]).symbol,'C5');
});
test('chords start together and arpeggios use actual pitches in any tuning',()=>{
  const positions=[{string:6,fret:0},{string:1,fret:0},{string:3,fret:2}],tuning=[70,45,50,55,59,40];
  assert.deepEqual(playbackPlan(positions,tuning).map(p=>p.delay),[0,0,0]);
  const up=playbackPlan(positions,tuning,'arpeggio',120,'up');
  assert.deepEqual(up.map(p=>p.midi),[40,57,70]);
  assert.deepEqual(up.map(p=>p.delay),[0,250,500]);
  assert.deepEqual(playbackPlan(positions,tuning,'arpeggio',60,'down').map(p=>p.midi),[70,57,40]);
  assert.deepEqual(playbackPlan(positions,tuning,'arpeggio',60,'selection').map(p=>p.string),[6,1,3]);
  assert.deepEqual(positions,[{string:6,fret:0},{string:1,fret:0},{string:3,fret:2}]);
});
test('the overview starts at the nut without reserving extended string space',()=>{
  assert.equal(rangeCamera(0,12).left,0);assert.equal(rangeCamera(1,5).left,0);
  assert.ok(rangeCamera(5,12).left>0);
});
