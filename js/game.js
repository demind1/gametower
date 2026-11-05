(()=>{
const root=document.getElementById('neon3d');if(root.dataset.ready)return;root.dataset.ready='1';root.tabIndex=0;
const $=id=>root.querySelector(id),canvas=$('#n-canvas'),gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});
if(!gl){$('#n-worldinfo').textContent='WebGL недоступен. Включи аппаратное ускорение браузера.';return}
const COLS=20,ROWS=12,T=1.8,MAX=20,HALF_X=(COLS-1)/2,HALF_Z=(ROWS-1)/2,PI=Math.PI;
const w=(c,r)=>({x:(c-HALF_X)*T,z:(r-HALF_Z)*T}), cell=(x,z)=>({c:Math.floor(x/T+COLS/2),r:Math.floor(z/T+ROWS/2)}),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const DEF={gun:{name:'Турель',cost:85,dmg:29,range:3.25,rate:.43,vel:19,color:'#55ddeb'},mg:{name:'Пулемёт',cost:150,dmg:16,range:3.45,rate:.12,vel:23,color:'#e9ae63'},rail:{name:'Рельсотрон',cost:235,dmg:160,range:5.3,rate:1.42,vel:32,color:'#9774d4',pierce:true},cryo:{name:'Крио',cost:190,dmg:23,range:3.45,rate:.76,vel:16,color:'#67caff',aoe:1.1,slow:2.4},mortar:{name:'Миномёт',cost:255,dmg:105,range:4.6,rate:1.3,vel:12,color:'#ff6952',aoe:1.95},arc:{name:'Тесла',cost:300,dmg:68,range:3.6,rate:.77,color:'#8398d4',chain:true},flame:{name:'Огнемёт',cost:205,dmg:18,range:2.6,rate:.16,vel:14,color:'#ff8a36',aoe:.64,burn:2.7},bank:{name:'Реактор',cost:190,range:0,income:55,color:'#56b9a2'}};
const path=[];function addLine(x,y,X,Y){const sx=Math.sign(X-x),sy=Math.sign(Y-y);for(;;){if(!path.length||path[path.length-1][0]!==x||path[path.length-1][1]!==y)path.push([x,y]);if(x===X&&y===Y)break;x+=sx;y+=sy}}
addLine(0,3,4,3);addLine(4,3,4,7);addLine(4,7,9,7);addLine(9,7,9,3);addLine(9,3,14,3);addLine(14,3,14,9);addLine(14,9,18,9);addLine(18,9,18,5);addLine(18,5,19,5);
const pathSet=new Set(path.map(p=>p.join(','))),route=[{x:w(0,3).x-2*T,z:w(0,3).z},...path.map(([c,r])=>w(c,r)),{x:w(19,5).x+T*2,z:w(19,5).z}];
let money,hp,wave,kills,towers,zombies,bullets,particles,beams,explosions,selected,build,ability,hover,active,paused,over,spawnLeft,spawnCount,total,spawnClock,speed,emp,boost,difficulty,uid,elapsed,shake,hudClock,msgClock,frameId=0;
let corpses=[];
let sounds=true,audioContext,lastBeep=-100;
function tone(freq=420,len=.05,type='triangle',gain=.008){if(!sounds)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audioContext)audioContext=new AC();if(audioContext.state==='suspended')audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(55,freq*.56),now+len);g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+len);o.connect(g);g.connect(audioContext.destination);o.start(now);o.stop(now+len+.01)}catch(e){}}

// Offline, layered procedural effects. They use no external files and no network access.
let noiseBuffer=null,lastZombieCall=-100,activeVoices=0,lastSfxByType={};
function getAudio(){if(!sounds)return null;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!audioContext)audioContext=new AC();if(audioContext.state==='suspended')audioContext.resume();return audioContext}catch(_){return null}}
function synthEffect(name,x=0,z=0,force=false){
 const ac=getAudio();if(!ac||activeVoices>28)return;
 const now=ac.currentTime,defs={
 gun:[148,.095,'square',.055,5200,.27],mg:[205,.065,'sawtooth',.025,3800,.53],rail:[830,.34,'sawtooth',.047,2900,.68],
 cryo:[560,.22,'triangle',.033,2500,.44],mortar:[87,.4,'sawtooth',.075,1800,.82],arc:[1250,.13,'sawtooth',.04,4800,.55],flame:[185,.18,'triangle',.023,2200,.5],
 zombie:[87,.4,'sawtooth',.033,720,.15],zombieDeath:[62,.35,'sawtooth',.025,560,.3],boss:[58,.85,'sawtooth',.07,880,.24],
 blast:[85,.48,'sawtooth',.07,1200,.95],siren:[260,.88,'sawtooth',.016,1650,.25]
 };
 const d=defs[name];if(!d)return;
 const cool={gun:.045,mg:.065,rail:.18,cryo:.13,mortar:.19,arc:.12,flame:.09,zombie:1.8,zombieDeath:.16,boss:1.8,blast:.08,siren:4}[name]||.1;
 if(!force&&elapsed-(lastSfxByType[name]||-999)<cool)return;lastSfxByType[name]=elapsed;
 const [pitch,duration,wave,volume,cutoff,noiseMix]=d,pan=Math.max(-.76,Math.min(.76,x/(COLS*T*.48)));
 const master=ac.createGain(),filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(Math.max(200,cutoff*.38),now+duration);
 let tail=filter;
 if(ac.createStereoPanner){const stereo=ac.createStereoPanner();stereo.pan.value=pan;filter.connect(stereo);tail=stereo}
 tail.connect(master);master.connect(ac.destination);
 master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(volume,now+.008);master.gain.exponentialRampToValueAtTime(.0001,now+duration);
 const osc=ac.createOscillator(),oscGain=ac.createGain();osc.type=wave;osc.frequency.setValueAtTime(pitch*(.95+Math.random()*.1),now);
 if(name==='zombie'||name==='zombieDeath'||name==='boss'){osc.frequency.setValueAtTime(pitch*1.15,now);osc.frequency.linearRampToValueAtTime(pitch*.65,now+duration)}else osc.frequency.exponentialRampToValueAtTime(Math.max(40,pitch*(name==='rail'?.12:.44)),now+duration);
 oscGain.gain.value=1-noiseMix*.55;osc.connect(oscGain);oscGain.connect(filter);osc.start(now);osc.stop(now+duration+.005);
 if(!noiseBuffer){noiseBuffer=ac.createBuffer(1,Math.floor(ac.sampleRate*.9),ac.sampleRate);const ar=noiseBuffer.getChannelData(0);for(let i=0;i<ar.length;i++)ar[i]=Math.random()*2-1}
 const source=ac.createBufferSource(),ng=ac.createGain();source.buffer=noiseBuffer;ng.gain.value=noiseMix*.85;source.connect(ng);ng.connect(filter);source.start(now,Math.random()*.15);source.stop(now+Math.min(duration,.65));
 activeVoices++;setTimeout(()=>{activeVoices=Math.max(0,activeVoices-1);try{source.disconnect();osc.disconnect();master.disconnect()}catch(_){}},Math.ceil((duration+.12)*1000));
}
function zombieVoice(e,dying=false){if(!sounds)return;if(e.type==='boss'){synthEffect('boss',e.x,e.z,true);return}if(dying){if(Math.random()<.12)synthEffect('zombieDeath',e.x,e.z)}else if(elapsed-lastZombieCall>2.0&&Math.random()<.3){synthEffect('zombie',e.x,e.z);lastZombieCall=elapsed}}

// Original, procedurally synthesized cyberpunk soundtrack (offline, starts on user input).
let musicEnabled=true,musicUnlocked=false,musicNext=0,musicBeat=0,musicVolume=.80;
const minorNotes=[110,130.81,146.83,164.81,196,220,261.63,293.66],arps=[0,2,4,6, 4,2,5,2, 0,3,4,7, 6,4,3,2];
function unlockMusic(){const ac=getAudio();if(!ac)return;musicUnlocked=true;if(!musicNext||musicNext<ac.currentTime)musicNext=ac.currentTime+.055;}
function musicOsc(freq,at,dur,kind,volume,cutoff=2200){const ac=audioContext;if(!ac||!musicEnabled||!sounds)return;const o=ac.createOscillator(),gain=ac.createGain(),filter=ac.createBiquadFilter();o.type=kind;o.frequency.setValueAtTime(freq,at);filter.type='lowpass';filter.frequency.value=cutoff;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*musicVolume),at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+dur);o.connect(filter);filter.connect(gain);gain.connect(ac.destination);o.start(at);o.stop(at+dur+.018)}
function musicPerc(at,kind){const ac=audioContext;if(!ac||!sounds||!musicEnabled)return;if(kind==='kick'){const o=ac.createOscillator(),v=ac.createGain();o.type='sine';o.frequency.setValueAtTime(155,at);o.frequency.exponentialRampToValueAtTime(49,at+.15);v.gain.setValueAtTime(.12*musicVolume,at);v.gain.exponentialRampToValueAtTime(.0001,at+.20);o.connect(v);v.connect(ac.destination);o.start(at);o.stop(at+.22);return;}if(!noiseBuffer){noiseBuffer=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const a=noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}const src=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();src.buffer=noiseBuffer;f.type='highpass';f.frequency.value=kind==='hat'?5000:1300;const length=kind==='hat'?.05:.13;g.gain.setValueAtTime((kind==='hat'?.014:.030)*musicVolume,at);g.gain.exponentialRampToValueAtTime(.0001,at+length);src.connect(f);f.connect(g);g.connect(ac.destination);src.start(at);src.stop(at+length+.01)}
function musicLoop(){if(!musicUnlocked||!musicEnabled||!sounds||!audioContext||audioContext.state!=='running')return;const now=audioContext.currentTime;if(musicNext<now-.6)musicNext=now+.05;let guard=0;while(musicNext<now+.125&&guard++<4){const n=musicBeat%16,bar=Math.floor(musicBeat/16),minor=minorNotes[(arps[n]+Math.floor(bar/2)%3)%minorNotes.length];const dur=60/(active?140:112)/4;if(n%4===0)musicPerc(musicNext,'kick');if(n===4||n===12)musicPerc(musicNext,'snare');if(n%2===0)musicPerc(musicNext,'hat');if(n%2===0)musicOsc(minor*2,musicNext,dur*1.7,'triangle',active?.009:.006,1800);if(n===0||n===8)musicOsc(minorNotes[(bar%3)]*.5,musicNext,dur*7,'sawtooth',.008,620);if(active&&(n===7||n===15))musicOsc(440,musicNext,dur*.5,'sine',.004,900);musicNext+=dur;musicBeat++}}

function toast(text,t=2.4){$('#n-toast').textContent=text;$('#n-toast').style.opacity='1';msgClock=t}
function hex(h){const s=h.slice(1);return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]}
function burst(x,z,color,count=12,pow=3,y=.8){for(let i=0;i<count;i++){const a=Math.random()*PI*2,s=pow*(.3+Math.random());particles.push({x,y,z,vx:Math.cos(a)*s,vy:(Math.random()-.1)*pow*1.2,vz:Math.sin(a)*s,ttl:.25+Math.random()*.55,col:color,size:.045+Math.random()*.10})}if(particles.length>550)particles.splice(0,particles.length-550)}
function ring(x,z,color,radius=2){explosions.push({x,z,color,radius,ttl:.48,total:.48})}
const MODS=['damage','rate','crit','skin'];
const modLabels={damage:'УРОН',rate:'СКОРОСТЬ',crit:'КРИТЫ',skin:'ОБЛИК'};
function mods(t){if(!t.mods)t.mods={damage:0,rate:0,crit:0,skin:0};return t.mods}
function modCost(t,k){const ix=MODS.indexOf(k),rank=mods(t)[k];return Math.round(75+DEF[t.type].cost*(.16+.05*ix)+rank*(64+ix*16)+t.level*16)}
function modValue(t,k){const m=mods(t),r=m[k];if(t.type==='bank'){return k==='damage'?`+${Math.round(r*22)}% доход`:k==='rate'?`+${Math.round(r*16)}% доход`:k==='crit'?`${Math.round(8+r*8)}% x2`: `облик ${r}/5`}
return k==='damage'?`+${Math.round(r*22)}% урон`:k==='rate'?`+${Math.round(r*17)}% темп`:k==='crit'?`${Math.round(6+r*7.5)}% шанс`: `облик ${r}/5`}
function modify(k){const t=selected;if(!t||over||!towers.includes(t)||!MODS.includes(k))return;const m=mods(t),rank=m[k],price=modCost(t,k);if(rank>=5||money<price)return;money-=price;t.invested+=price;m[k]++;burst(t.x,t.z,DEF[t.type].color,18,4);ring(t.x,t.z,DEF[t.type].color,1.65);tone(725+rank*70,.16,'triangle',.016);toast(`МОДУЛЬ ${modLabels[k]} · РАНГ ${m[k]}/5`);hud()}
function critChance(t){return .06+mods(t).crit*.075}
function critPower(t){return 1.65+mods(t).crit*.21}
function lvCost(t){return Math.round(DEF[t.type].cost*.62+t.level*76)}function range(t){return T*(DEF[t.type].range+(t.level-1)*.28)}function dmg(t){return DEF[t.type].dmg*(1+.56*(t.level-1))*(1+mods(t).damage*.22)}function income(t){const m=mods(t),base=DEF.bank.income*(1+(t.level-1)*.7)*(1+.22*m.damage+.16*m.rate);return Math.round(base)}
function reset(){corpses=[];inspecting=false;money=580;hp=28;wave=0;kills=0;towers=[];zombies=[];bullets=[];particles=[];beams=[];explosions=[];selected=null;build='gun';ability=null;hover=null;active=false;paused=false;over=false;spawnLeft=0;spawnCount=0;total=0;spawnClock=0;speed=1;emp=0;boost=0;difficulty=1;uid=0;elapsed=0;shake=0;hudClock=0;msgClock=0;$('#n-end').style.display='none';$('#n-progress').style.width='0%';$('#n-difficulty').value='1';$('#n-difficulty').disabled=false;toast('3D-ПРОТОКОЛ АКТИВЕН · УДЕРЖИ СЕКТОР 09',4);hud()}
function hud(){
$('#n-cash').textContent=Math.floor(money);$('#n-hp').textContent=hp;$('#n-wave').textContent=wave+'/20';$('#n-kills').textContent=kills;
$('#n-start').disabled=active||over||paused||wave>=MAX;$('#n-start').textContent=active?'☣ ИДЁТ ВОЛНА '+wave:'▶ ЗАПУСТИТЬ ВОЛНУ '+(wave+1);
$('#n-pause').textContent=paused?'▶ Продолжить':'Ⅱ Пауза';$('#n-speed').textContent='×'+speed;
$('#n-bomb').disabled=money<150||over;$('#n-emp').disabled=money<125||over||!active;$('#n-boost').disabled=money<115||over||!active;$('#n-repair').disabled=money<120||over||hp>=28;
$('#n-bomb').style.borderColor=ability==='bomb'?'#ffe3a9':'#3d4e5b';
root.querySelectorAll('.item').forEach(el=>{el.classList.toggle('active',build===el.dataset.type);el.style.opacity=money<DEF[el.dataset.type].cost?'.62':'1'});
const up=$('#n-up'),sel=$('#n-sell'),tar=$('#n-target');if(selected&&towers.includes(selected)){
const t=selected,c=lvCost(t),d=DEF[t.type];up.disabled=over||t.level>=4||money<c;up.textContent=t.level>=4?'★ МАКСИМУМ':'↑ Улучшить · '+c+' $';sel.disabled=over;sel.textContent='Продать · '+Math.floor(t.invested*.65)+' $';tar.disabled=t.type==='bank'||over;tar.textContent='Цель: '+({first:'первые',strong:'сильные',near:'ближние'}[t.priority]);$('#n-info').textContent=d.name+' · уровень '+t.level+'/4 · '+(t.type==='bank'?'доход +'+income(t)+' $/волна':'урон '+Math.round(dmg(t))+' · крит '+Math.round(critChance(t)*100)+'% · радиус '+(range(t)/T).toFixed(1)+' клетки')+' · вложено '+t.invested+' $';
}else{selected=null;up.disabled=sel.disabled=tar.disabled=true;up.textContent='↑ Улучшить';sel.textContent='Продать';tar.textContent='Цель: первые';$('#n-info').textContent=ability==='bomb'?'Выбери точку удара на 3D-карте. Радиус: 2,6 клетки.':build?'Выбрано: '+DEF[build].name+' · '+DEF[build].cost+' $. Нажми на свободную клетку.':'Выбери тип башни либо нажми на построенную башню.'}
root.querySelectorAll('.mod').forEach(b=>{const t=selected,k=b.dataset.mod;if(!t||!towers.includes(t)){b.disabled=true;b.querySelector('.mod-value').textContent='Выбери башню';return}const rank=mods(t)[k],price=modCost(t,k);b.disabled=over||rank>=5||money<price;b.querySelector('.mod-title').textContent=''+({damage:'⚔ ',rate:'ϟ ',crit:'✧ ',skin:'◈ '}[k])+((t.type==='bank'?{damage:'ДОХОД',rate:'ЭФФЕКТ.',crit:'ДВОЙНОЙ',skin:'ОБЛИК'}:modLabels)[k]);b.querySelector('.mod-value').textContent=rank>=5?'MAX V / V':(''+rank+'/5 · '+price+' $');b.title=modValue(t,k)+' · следующая модификация '+price+' $'});
if(active)$('#n-progress').style.width=Math.max(0,100*(spawnCount-zombies.length)/Math.max(1,total))+'%';
}
function choose(type){build=type;ability=null;selected=null;hud()}
function place(c,r){if(over||paused||c<0||r<0||c>=COLS||r>=ROWS)return;const t=towers.find(v=>v.c===c&&v.r===r);if(t){selected=t;build=null;ability=null;hud();tone(600,.04);return}if(pathSet.has(c+','+r)){toast('НЕЛЬЗЯ СТРОИТЬ НА ДОРОГЕ');tone(150,.1,'sawtooth');return}if(!build){toast('СНАЧАЛА ВЫБЕРИ БАШНЮ');return}const d=DEF[build];if(money<d.cost){toast('НЕ ХВАТАЕТ КРЕДИТОВ');tone(170,.09,'sawtooth');return}money-=d.cost;const p=w(c,r);const built={id:++uid,type:build,c,r,x:p.x,z:p.z,level:1,invested:d.cost,priority:'first',aim:0,cool:.1,flash:0,mods:{damage:0,rate:0,crit:0,skin:0}};towers.push(built);selected=built;build=null;burst(p.x,p.z,d.color,15,2);ring(p.x,p.z,d.color,1.1);tone(760,.1);hud()}
function upgrade(){const t=selected;if(!t||over||!towers.includes(t)||t.level>=4)return;let c=lvCost(t);if(money<c)return;money-=c;t.invested+=c;t.level++;burst(t.x,t.z,'#ffe7ac',24,4);ring(t.x,t.z,'#fbe8bc',2);tone(940,.15);hud()}
function sell(){const t=selected;if(!t||over)return;money+=Math.floor(t.invested*.65);towers=towers.filter(v=>v!==t);burst(t.x,t.z,'#c8f8ff',16,2.5);selected=null;build=null;tone(310,.08);hud()}
function priority(){if(!selected)return;selected.priority={first:'strong',strong:'near',near:'first'}[selected.priority];hud()}
function freeze(){if(!active||over||money<125)return;money-=125;emp=4.5;ring(0,0,'#83ebff',28);toast('EMP: ВСЯ ОРДА ЗАМЕДЛЕНА НА 4.5 СЕКУНДЫ');tone(670,.34,'sine',.025);hud()}
function overdrive(){if(!active||over||money<115)return;money-=115;boost=7;toast('ФОРСАЖ: +60% К СКОРОСТРЕЛЬНОСТИ НА 7 СЕКУНД');tone(890,.19);hud()}
function repair(){if(money<120||over||hp>=28)return;money-=120;hp=Math.min(28,hp+8);let p=w(19,5);burst(p.x,p.z,'#b8ffc9',22,4,2);tone(840,.18);hud()}
function orbital(x,z){if(money<150||over)return;money-=150;ability=null;selected=null;build=null;ring(x,z,'#ffcd97',T*2.45);burst(x,z,'#ffe3b9',76,8,1.2);synthEffect('blast',x,z,true);shake=.28;for(const e of zombies){let dis=Math.hypot(e.x-x,e.z-z);if(!e.dead&&dis<T*2.45)hit(e,(450+wave*30)*(1-.38*dis/(T*2.45)),true)}tone(105,.42,'sawtooth',.045);hud()}
function makeType(i,n){if(wave%5===0&&i===n-1)return'boss';if(wave>=9&&i%12===9)return'bulwark';if(wave>=7&&i%11===6)return'reaper';if(wave>=5&&i%10===3)return'regen';if(wave>=8&&i%13===9)return'brute';if(wave>=6&&i%10===7)return'splitter';if(wave>=4&&i%8===4)return'armor';if(wave>=3&&i%7===3)return'shadow';if(wave>=2&&i%4===2)return'runner';return'walker'}
function spawn(type,x=route[0].x,z=route[0].z,segment=1){const sc=1.22+.26*(wave-1)+.013*(wave-1)*(wave-1),st={walker:[72,1.10,.7,14],runner:[48,2.1,.57,12],armor:[215,.8,.86,29],shadow:[84,1.72,.62,21],splitter:[145,1.24,.74,26],brute:[440,.73,1.07,52],bulwark:[660,.66,1.14,60],reaper:[130,2.30,.74,25],regen:[310,1.03,.80,35],boss:[1300+wave*255,.61,1.45,240],mini:[32,2.15,.43,7]}[type],health=st[0]*sc*difficulty;zombies.push({id:++uid,type,x,z,seg:segment,hp:health,max:health,v:st[1]+(type==='boss'?0:wave*.023),scale:st[2],reward:st[3],age:Math.random()*2,angle:0,slow:0,burn:0,dead:false});if(type==='boss')synthEffect('boss',x,z,true);}
function start(){if(over||active||paused||wave>=MAX)return;wave++;active=true;difficulty=Number($('#n-difficulty').value)||1;$('#n-difficulty').disabled=true;total=20+wave*6+(wave%5===0?20:0);spawnLeft=total;spawnCount=0;spawnClock=.25;toast(wave%5===0?'⚠ БОСС И ОРДА · ВОЛНА '+wave:'☣ ВОЛНА '+wave+' · '+total+' ЗАРАЖЁННЫХ',3.3);tone(175,.3,'sawtooth',.028);synthEffect('siren',0,0,true);hud()}
function kill(e){if(e.dead)return;e.dead=true;corpses.push({...e,ttl:.65});if(corpses.length>24)corpses.shift();kills++;money+=e.reward;burst(e.x,e.z,e.type==='boss'?'#ff929a':'#a9d4b8',e.type==='boss'?54:12,e.type==='boss'?8:3,e.scale*1.3);if(e.type==='boss'){shake=.27;tone(125,.3,'sawtooth',.035)}zombieVoice(e,true);if(e.type==='splitter')for(let i=0;i<2;i++)spawn('mini',e.x+(i?.3:-.3),e.z+(i?-.2:.2),e.seg)}
function hit(e,amount,pierce=false,slow=0,burn=0){if(e.dead)return;e.hurt=.18;e.hp-=amount*(((e.type==='armor'||e.type==='bulwark')&&!pierce)?(e.type==='bulwark'?.42:.57):1);e.slow=Math.max(e.slow,slow);e.burn=Math.max(e.burn,burn);if(e.hp<=0)kill(e)}
function target(t){let best=null,score=-Infinity;for(const e of zombies){if(e.dead)continue;let di=Math.hypot(e.x-t.x,e.z-t.z);if(di>range(t))continue;let k=t.priority==='strong'?e.hp:t.priority==='near'?-di:e.seg*1000-di;if(k>score){score=k;best=e}}return best}
function shoot(t,e){const d=DEF[t.type];t.aim=Math.atan2(e.x-t.x,e.z-t.z);t.cool=d.rate/(1+.14*(t.level-1))/(1+mods(t).rate*.17)/(boost>0?1.6:1);t.flash=.1;const crit=Math.random()<critChance(t),shotDamage=dmg(t)*(crit?critPower(t):1);
if(d.chain){let cur=e,prev={x:t.x,y:1.3,z:t.z},seen=new Set();for(let i=0;i<3+Math.floor((t.level-1)/2)&&cur;i++){const to={x:cur.x,y:.95*cur.scale+0.2,z:cur.z};beams.push({a:prev,b:to,ttl:.19,color:d.color});let x=cur.x,z=cur.z;hit(cur,shotDamage*Math.pow(.77,i),true);seen.add(cur.id);prev={x,y:to.y,z};let next=null,near=2.6;for(let q of zombies){let distance=Math.hypot(q.x-x,q.z-z);if(!q.dead&&!seen.has(q.id)&&distance<near){near=distance;next=q}}cur=next}burst(e.x,e.z,'#b0c0ff',7,2)}
else{bullets.push({x:t.x,y:1.52,z:t.z,tx:e.x,ty:.95*e.scale+0.2,tz:e.z,target:e,type:t.type,damage:shotDamage,critical:crit,vel:d.vel,aoe:d.aoe||0,slow:d.slow||0,burn:d.burn||0,pierce:!!d.pierce,color:d.color,ttl:2})}
synthEffect(t.type,t.x,t.z)
}
function finish(win){over=true;active=false;paused=false;$('#n-end').style.display='flex';$('#n-emblem').textContent=win?'🏆':'☠';$('#n-endtitle').textContent=win?'СЕКТОР ОЧИЩЕН':'ОБОРОНА ПАЛА';$('#n-endtitle').style.color=win?'#c3f6ff':'#ffa3a2';$('#n-endinfo').textContent=win?'Ты пережил 20 волн и уничтожил '+kills+' заражённых. Периметр удержан.':'База уничтожена на волне '+wave+'. Убито '+kills+' мутантов. Перестрой оборону и попробуй снова.';tone(win?800:125,.4,win?'triangle':'sawtooth',.045);hud()}
function step(dt){if(!paused){for(const body of corpses)body.ttl-=dt;corpses=corpses.filter(body=>body.ttl>0)}elapsed+=dt;if(msgClock>0){msgClock-=dt;if(msgClock<=0)$('#n-toast').style.opacity='0'}shake=Math.max(0,shake-dt);if(paused||over)return;emp=Math.max(0,emp-dt);boost=Math.max(0,boost-dt);
if(active&&spawnLeft){spawnClock-=dt;while(spawnClock<=0&&spawnLeft){spawn(makeType(spawnCount,total));spawnLeft--;spawnCount++;spawnClock+=Math.max(.16,.46-wave*.010)}}
for(const e of zombies){if(e.dead)continue;e.hurt=Math.max(0,(e.hurt||0)-dt);e.age+=dt;e.slow=Math.max(0,e.slow-dt);if(active&&Math.random()<dt*.085)zombieVoice(e);if(e.type==='regen')e.hp=Math.min(e.max,e.hp+dt*e.max*.011);if(e.burn>0){e.burn=Math.max(0,e.burn-dt);e.hp-=28*dt;if(e.hp<=0){kill(e);continue}}let travel=dt*e.v*(emp>0?.065:e.slow>0?.43:1),guard=0;while(travel>0&&e.seg<route.length&&guard++<35){const p=route[e.seg],dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);if(d<.00001){e.seg++;continue}e.angle=Math.atan2(dx,dz);if(travel>=d){e.x=p.x;e.z=p.z;e.seg++;travel-=d}else{e.x+=dx/d*travel;e.z+=dz/d*travel;travel=0}}if(e.seg>=route.length){e.dead=true;hp=Math.max(0,hp-(e.type==='boss'?5:e.type==='bulwark'?3:e.type==='reaper'?2:e.type==='brute'?2:1));const base=w(19,5);burst(base.x,base.z,'#ff8c91',20,4,1.5);shake=.18;tone(110,.15,'sawtooth',.025);if(hp<=0){finish(false);break}}}
if(!over){for(const t of towers){if(t.type==='bank')continue;t.cool-=dt;t.flash=Math.max(0,t.flash-dt);if(t.cool<=0){const e=target(t);if(e)shoot(t,e);else t.cool=0}}
for(const b of bullets){if(b.dead)continue;b.ttl-=dt;if(b.ttl<=0){b.dead=true;continue}if(!b.target.dead){b.tx=b.target.x;b.tz=b.target.z;b.ty=b.target.scale*.95+.15}if(b.target.dead&&!b.aoe){b.dead=true;continue}b.px=b.x;b.py=b.y;b.pz=b.z;const dx=b.tx-b.x,dy=b.ty-b.y,dz=b.tz-b.z,len=Math.hypot(dx,dy,dz),step=b.vel*dt;if(len<=step+.21){b.dead=true;if(b.aoe){burst(b.tx,b.tz,b.color,b.type==='mortar'?25:11,b.type==='mortar'?5:2,b.ty);if(b.critical){ring(b.tx,b.tz,'#fff1c0',b.aoe*.64);burst(b.tx,b.tz,'#fff6cb',11,3,b.ty)}if(b.type==='mortar'){ring(b.tx,b.tz,b.color,b.aoe);synthEffect('blast',b.tx,b.tz);shake=Math.max(shake,.07)}for(const e of zombies){let di=Math.hypot(e.x-b.tx,e.z-b.tz);if(!e.dead&&di<b.aoe+.2)hit(e,b.damage*(b.type==='mortar'?1-.3*di/b.aoe:1),b.pierce,b.slow,b.burn)}}else if(!b.target.dead){hit(b.target,b.damage,b.pierce);burst(b.tx,b.tz,b.critical?'#fffee2':b.color,b.critical?17:b.type==='rail'?9:3,b.critical?3:1.5,b.ty);if(b.critical)ring(b.tx,b.tz,'#fff3bc',.85)}}else{b.x+=dx/len*step;b.y+=dy/len*step;b.z+=dz/len*step}}
zombies=zombies.filter(e=>!e.dead);bullets=bullets.filter(b=>!b.dead);
if(active&&spawnLeft===0&&zombies.length===0){active=false;const bonus=85+wave*32+Math.round(towers.filter(t=>t.type==='bank').reduce((sum,t)=>sum+income(t)*(Math.random()<.08+mods(t).crit*.08?2:1),0));money+=bonus;$('#n-progress').style.width='100%';if(wave===MAX)finish(true);else{toast('✓ ВОЛНА '+wave+' ОТБИТА · +'+bonus+' КРЕДИТОВ',4);tone(800,.2)}hud()}}
for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=6*dt;p.ttl-=dt}particles=particles.filter(p=>p.ttl>0&&p.y>-.5);for(const b of beams)b.ttl-=dt;beams=beams.filter(b=>b.ttl>0);for(const r of explosions)r.ttl-=dt;explosions=explosions.filter(r=>r.ttl>0);
hudClock-=dt;if(hudClock<=0){hudClock=.16;hud()}}
// Native WebGL meshes and shaders: all scenery, towers, zombies and impacts are actual 3D geometry.
const VS=`
attribute vec3 aPos; attribute vec3 aNorm;
uniform mat4 uVP; uniform mat4 uM; uniform mat3 uNormal; uniform mat4 uLightVP; varying vec4 vShadow;
varying vec3 vN; varying vec3 vWorld; varying float vDist;
void main(){vec4 w=uM*vec4(aPos,1.0);gl_Position=uVP*w;vWorld=w.xyz;vN=normalize(uNormal*aNorm);vShadow=uLightVP*w;vDist=gl_Position.w;}`;
const FS=`
precision highp float;
uniform vec4 uColor;uniform float uGlow,uMat,uTime,uClipBelow,uReflectionOn,uDirect;
uniform vec3 uEye;uniform vec4 uFlash;uniform sampler2D uDetailTex,uSurfaceTex,uReflectionTex,uShadowTex;
uniform mat4 uReflectionVP;uniform float uShadowPass,uShadowOn;uniform vec2 uShadowTexel;
varying vec3 vN,vWorld;varying float vDist;varying vec4 vShadow;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noiset(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float shadow(vec3 n,vec3 l){
 if(uShadowOn<.5)return 1.;vec3 q=vShadow.xyz/vShadow.w*.5+.5;
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 1.;
 float lit=0.;float bias=max(.0005,.0016*(1.-max(dot(n,l),0.)));
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
 vec3 d=texture2D(uShadowTex,q.xy+vec2(float(x),float(y))*uShadowTexel).rgb;
 lit+=step(q.z-bias,dot(d,vec3(1.,1./255.,1./65025.)));}return lit/9.;
}
void main(){
 if(vWorld.y<uClipBelow)discard;
 if(uShadowPass>.5){vec3 enc=fract(gl_FragCoord.z*vec3(1.,255.,65025.));enc-=enc.yzz*vec3(1./255.,1./255.,0.);gl_FragColor=vec4(enc,1.);return;}
 vec3 geometric=normalize(vN),n=geometric,v=normalize(uEye-vWorld),l=normalize(vec3(-.54,.88,.31)),h=normalize(v+l);
 vec2 uv=(abs(n.y)>.6?vWorld.xz:abs(n.x)>.6?vWorld.zy:vWorld.xy)*.34;
 vec3 detail=texture2D(uDetailTex,uv).rgb;vec4 surface=texture2D(uSurfaceTex,uv);
 vec3 tangent=normalize(abs(n.y)>.6?vec3(1,0,0):cross(vec3(0,1,0),n));vec3 bitangent=normalize(cross(n,tangent));
 float bump=uMat>3.5&&uMat<4.5?.12:uMat>1.5&&uMat<2.5?.19:.32;
 n=normalize(n+(tangent*(surface.r*2.-1.)+bitangent*(surface.g*2.-1.))*bump);
 float rough=.48,metal=.5;
 if(uMat>.5&&uMat<1.5){rough=.91;metal=0.;}
 if(uMat>1.5&&uMat<2.5){rough=.29;metal=0.;}
 if(uMat>2.5&&uMat<3.5){rough=.28;metal=.92;}
 if(uMat>3.5&&uMat<4.5){rough=.72;metal=0.;}
 if(uMat>4.5&&uMat<5.5){rough=.94;metal=0.;}
 if(uMat>5.5&&uMat<6.5){rough=.16;metal=.12;}
 if(uMat>6.5){rough=.43;metal=.08;}
 float puddle=smoothstep(.56,.79,noiset(vWorld.xz*.71+15.));
 if(uMat>1.5&&uMat<2.5)rough=mix(.65,.15,puddle);
 rough=clamp(rough+(surface.b-.5)*.18,.12,.97);
 vec3 albedo=pow(uColor.rgb,vec3(2.2))*(.82+.32*detail.r);
 float nv=max(dot(n,v),.001),nl=max(dot(n,l),0.),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
 float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(3.14159*den*den+.0001);
 float k=(rough+1.)*(rough+1.)/8.;float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
 vec3 F0=mix(vec3(.04),albedo,metal),F=F0+(1.-F0)*pow(1.-vh,5.);
 vec3 spec=D*G*F/max(.004,4.*nv*max(nl,.001));float visibility=shadow(geometric,l);
 vec3 rgb=((1.-F)*(1.-metal)*albedo/3.14159+spec)*nl*vec3(2.8,3.05,3.25)*mix(.23,1.,visibility);
 float ao=surface.a*mix(.64,1.,smoothstep(0.,.7,vWorld.y));
 rgb+=albedo*(vec3(.30,.39,.48)+vec3(.13,.10,.07)*max(0.,dot(n,normalize(vec3(.7,.3,-.6)))))*ao;
 rgb+=F0*vec3(.10,.16,.20)*(1.-rough)*ao;
 rgb+=pow(uColor.rgb,vec3(2.2))*min(uGlow,2.5)*.52;
 if(uReflectionOn>.5&&uMat>1.5&&uMat<2.5){
 vec4 rp=uReflectionVP*vec4(vWorld.x,.045,vWorld.z,1.);vec2 ru=rp.xy/rp.w*.5+.5;
 ru+=(surface.rg-.5)*.005+vec2(sin(uTime*.6+vWorld.z*8.),cos(vWorld.x*9.))*.00045;
 if(rp.w>0.&&ru.x>.004&&ru.y>.004&&ru.x<.996&&ru.y<.996){
 vec2 spread=vec2(.004)*rough;vec3 ref=texture2D(uReflectionTex,ru).rgb*.4;
 ref+=(texture2D(uReflectionTex,ru+spread).rgb+texture2D(uReflectionTex,ru-spread).rgb)*.3;
 float fresnel=.04+.96*pow(1.-nv,5.);float weight=clamp((.07+.58*puddle)*fresnel*(1.-rough),0.,.32);
 rgb=mix(rgb,ref,weight);}}
 vec3 toFlash=uFlash.xyz-vWorld;float fd=max(dot(toFlash,toFlash),.2);rgb+=albedo*vec3(1.,.66,.30)*max(dot(n,normalize(toFlash)),0.)*uFlash.w/(1.+fd*2.);
 float fog=clamp((vDist-38.)/110.,0.,.40);rgb=mix(rgb,vec3(.018,.027,.038),fog);
 if(uDirect>.5)rgb=pow(clamp((rgb*1.12*(2.51*rgb*1.12+.03))/(rgb*1.12*(2.43*rgb*1.12+.59)+.14),0.,1.),vec3(1./2.2));
 gl_FragColor=vec4(rgb,uColor.a);
}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,VS));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const loc={direct:gl.getUniformLocation(program,'uDirect'),flash:gl.getUniformLocation(program,'uFlash'),normal:gl.getUniformLocation(program,'uNormal'),eye:gl.getUniformLocation(program,'uEye'),surface:gl.getUniformLocation(program,'uSurfaceTex'),lightVP:gl.getUniformLocation(program,'uLightVP'),shadowPass:gl.getUniformLocation(program,'uShadowPass'),shadowOn:gl.getUniformLocation(program,'uShadowOn'),shadowTex:gl.getUniformLocation(program,'uShadowTex'),shadowTexel:gl.getUniformLocation(program,'uShadowTexel'),p:gl.getAttribLocation(program,'aPos'),n:gl.getAttribLocation(program,'aNorm'),vp:gl.getUniformLocation(program,'uVP'),m:gl.getUniformLocation(program,'uM'),color:gl.getUniformLocation(program,'uColor'),glow:gl.getUniformLocation(program,'uGlow'),mat:gl.getUniformLocation(program,'uMat'),time:gl.getUniformLocation(program,'uTime'),clip:gl.getUniformLocation(program,'uClipBelow'),reflOn:gl.getUniformLocation(program,'uReflectionOn'),reflVP:gl.getUniformLocation(program,'uReflectionVP'),reflTex:gl.getUniformLocation(program,'uReflectionTex'),detailTex:gl.getUniformLocation(program,'uDetailTex')};

// Procedural 1024×1024 material detail texture: fine scratches, concrete grit and worn paint.
// Deterministically generated once, then mipmapped and anisotropically filtered on GPU.
function makeDetailTexture(){
 const size=1024,off=document.createElement('canvas');off.width=off.height=size;
 const cx=off.getContext('2d'),id=cx.createImageData(size,size),a=id.data;
 let rng=0xA917F3D1;function roll(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296}
 const coarse=new Uint8Array(128*128);for(let i=0;i<coarse.length;i++)coarse[i]=Math.floor(roll()*255);
 const scratchX=new Uint8Array(size);for(let x=0;x<size;x++)scratchX[x]=(roll()>.992?120:0);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,k=(Math.floor(y/8)*128+Math.floor(x/8)),fine=roll()*255,
    rock=coarse[k],seam=((x+3*y)%241===0||y%307===0)?35:0,sc=scratchX[x]*(roll()>.40?1:.22),
    paint=Math.max(8,Math.min(247,118+(rock-128)*.22+(fine-128)*.48-seam-sc*.18));
  a[i]=paint;a[i+1]=Math.max(0,Math.min(255,120+(rock-128)*.27+(fine-128)*.48));
  a[i+2]=Math.max(0,Math.min(255,sc+seam*.8+(fine-128)*.18+48));a[i+3]=255;
 }
 cx.putImageData(id,0,0);const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,off);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 gl.generateMipmap(gl.TEXTURE_2D);
 const anis=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
 if(anis){const max=gl.getParameter(anis.MAX_TEXTURE_MAX_ANISOTROPY_EXT);gl.texParameterf(gl.TEXTURE_2D,anis.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,max))}
 gl.uniform1i(loc.detailTex,2);gl.activeTexture(gl.TEXTURE0);return texture;
}
const materialDetailTexture=makeDetailTexture();
// Packed tangent-space normal XY, roughness, AO. Shared, deterministic, no downloaded assets.
function makeSurfaceTexture(){
 const size=1024,data=new Uint8Array(size*size*4);const height=(x,y)=>noise((x&1023)*127+(y&1023)*8191)*.65+Math.sin(x*.18)*.12;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,h=height(x,y);data[i]=128+(height(x-1,y)-height(x+1,y))*65;data[i+1]=128+(height(x,y-1)-height(x,y+1))*65;data[i+2]=90+h*125;data[i+3]=210+h*45;}
 const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,data);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);gl.uniform1i(loc.surface,4);gl.activeTexture(gl.TEXTURE0);return tex;
}
const surfaceTexture=makeSurfaceTexture();
function setModel(m){gl.uniformMatrix4fv(loc.m,false,m);const n=[];for(let c=0;c<3;c++){const i=c*4,d=m[i]*m[i]+m[i+1]*m[i+1]+m[i+2]*m[i+2]||1;n.push(m[i]/d,m[i+1]/d,m[i+2]/d)}gl.uniformMatrix3fv(loc.normal,false,n);}


function mesh(pos,norm,ind){const m={v:gl.createBuffer(),n:gl.createBuffer(),i:gl.createBuffer(),count:ind.length};gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(norm),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(ind),gl.STATIC_DRAW);m.cpuV=pos;m.cpuN=norm;m.cpuI=ind;return m}
function cubeMesh(){let v=[],n=[],i=[];const faces=[[[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]],[[1,0,0],[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]],[[-1,0,0],[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]],[[0,1,0],[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]],[[0,-1,0],[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]]];for(const [no,quad]of faces){const start=v.length/3;for(const pt of quad){v.push(...pt);n.push(...no)}i.push(start,start+1,start+2,start,start+2,start+3)}return mesh(v,n,i)}
function outward(indices){for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t}return indices}
function cylMesh(N=12,top=.5,bottom=.5){let v=[],n=[],i=[];for(let j=0;j<N;j++){let a=j*PI*2/N,b=(j+1)*PI*2/N;let ar=[Math.cos(a),Math.sin(a)],br=[Math.cos(b),Math.sin(b)],k=v.length/3;v.push(ar[0]*bottom,-.5,ar[1]*bottom,br[0]*bottom,-.5,br[1]*bottom,br[0]*top,.5,br[1]*top,ar[0]*top,.5,ar[1]*top);n.push(ar[0],0,ar[1],br[0],0,br[1],br[0],0,br[1],ar[0],0,ar[1]);i.push(k,k+1,k+2,k,k+2,k+3)}for(const face of [-1,1]){let center=v.length/3;v.push(0,face*.5,0);n.push(0,face,0);for(let j=0;j<=N;j++){let a=j*PI*2/N;v.push(Math.cos(a)*(face===1?top:bottom),face*.5,Math.sin(a)*(face===1?top:bottom));n.push(0,face,0);if(j>0){if(face===1)i.push(center,center+j,center+j+1);else i.push(center,center+j+1,center+j)}}}return mesh(v,n,outward(i))}
function sphereMesh(N=12,M=8){let v=[],n=[],i=[];for(let y=0;y<=M;y++){let th=y*PI/M;for(let x=0;x<=N;x++){let ph=x*2*PI/N,q=[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)];v.push(q[0]*.5,q[1]*.5,q[2]*.5);n.push(...q)}}for(let y=0;y<M;y++)for(let x=0;x<N;x++){const a=y*(N+1)+x,b=a+N+1;i.push(a,b,a+1,b,b+1,a+1)}return mesh(v,n,outward(i))}
function torusMesh(N=24,M=5,tube=.036){let v=[],n=[],i=[];for(let a=0;a<=N;a++)for(let b=0;b<=M;b++){let theta=a*PI*2/N,phi=b*PI*2/M,rg=.5+Math.cos(phi)*tube;v.push(rg*Math.cos(theta),Math.sin(phi)*tube,rg*Math.sin(theta));n.push(Math.cos(phi)*Math.cos(theta),Math.sin(phi),Math.cos(phi)*Math.sin(theta))}for(let a=0;a<N;a++)for(let b=0;b<M;b++){let p=a*(M+1)+b,q=p+M+1;i.push(p,q,p+1,q,q+1,p+1)}return mesh(v,n,outward(i))}
// Surfaces of revolution: machined housings with stepped shoulders and tapered edges.
function latheMesh(profile,N=24){const v=[],n=[],ix=[];for(let j=0;j<profile.length;j++){const [r,y]=profile[j],lo=profile[Math.max(0,j-1)],hi=profile[Math.min(profile.length-1,j+1)],dy=hi[1]-lo[1],dr=hi[0]-lo[0],len=Math.hypot(dy,dr)||1;for(let k=0;k<=N;k++){const a=k*PI*2/N,c=Math.cos(a),q=Math.sin(a);v.push(r*c,y,r*q);n.push(c*dy/len,-dr/len,q*dy/len);if(j&&k){const b=j*(N+1)+k;ix.push(b-N-2,b-N-1,b,b-N-2,b,b-1)}}}return mesh(v,n,outward(ix))}
const meshes={housing:latheMesh([[0,-.5],[.34,-.5],[.48,-.34],[.5,-.18],[.5,.22],[.39,.46],[.25,.5],[0,.5]]),barrel:latheMesh([[.30,-.5],[.45,-.5],[.5,-.43],[.5,-.31],[.36,-.25],[.36,.28],[.47,.34],[.47,.5],[.30,.5],[.30,.35]]),lowSphere:sphereMesh(8,6),box:cubeMesh(),cyl:cylMesh(18),cone:cylMesh(16,.13,.5),sphere:sphereMesh(18,12),ring:torusMesh(32,7),hairline:torusMesh(72,7,.006)};
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mult(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}function norm(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l)}
let yaw=-.68,pitch=1.09,zoom=55,smoothYaw=yaw,smoothPitch=pitch,smoothZoom=zoom,cameraMoving=false,inspecting=false,focusX=0,focusZ=0,camBasis=null,vp=identity();
function camera(reflected=false){const eye=[focusX+Math.sin(smoothYaw)*Math.cos(smoothPitch)*smoothZoom,(reflected?-1:1)*Math.sin(smoothPitch)*smoothZoom,focusZ+Math.cos(smoothYaw)*Math.cos(smoothPitch)*smoothZoom],back=norm([eye[0]-focusX,eye[1]-(reflected?-1:1)*(inspecting?.8:-2.25),eye[2]-focusZ]),right=norm(cross([0,1,0],back)),up=cross(back,right),v=[right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-dot(right,eye),-dot(up,eye),-dot(back,eye),1],aspect=canvas.width/canvas.height;vp=mult(perspective(PI/4.2,aspect,.1,125),v);if(!reflected)camBasis={eye,right,up,forward:back.map(n=>-n),aspect};gl.uniform3fv(loc.eye,eye);gl.uniformMatrix4fv(loc.vp,false,new Float32Array(vp))}
function model(x,y,z,sx=1,sy=1,sz=1,rot=0){const c=Math.cos(rot),s=Math.sin(rot);return[c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1]}
function beamModel(a,b,width){let d=sub([b.x,b.y,b.z],[a.x,a.y,a.z]),len=Math.hypot(...d);if(len<.0001)len=.001;let yy=d.map(x=>x/len),xx=norm(cross(Math.abs(yy[1])>.9?[0,0,1]:[0,1,0],yy)),zz=cross(yy,xx);return[xx[0]*width,xx[1]*width,xx[2]*width,0,yy[0]*len,yy[1]*len,yy[2]*len,0,zz[0]*width,zz[1]*width,zz[2]*width,0,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,1]}
let lastMesh=null,lastColor=null,staticCapture=null;function draw(name,x,y,z,sx,sy,sz,col,rot=0,glow=0,alpha=1,mat=0){if(staticCapture){staticCapture.push({name,x,y,z,sx,sy,sz,col,rot,glow,alpha,mat});return}const m=meshes[name];if(m!==lastMesh){gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);lastMesh=m}setModel(model(x,y,z,sx,sy,sz,rot));const c=Array.isArray(col)?col:hex(col);gl.uniform4f(loc.color,c[0],c[1],c[2],alpha);gl.uniform1f(loc.glow,glow*.55);gl.uniform1f(loc.mat,mat);drawCalls++;gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0)}
function line3(a,b,width,col,glow=0,mat=3){const m=meshes.cyl;if(m!==lastMesh){gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);lastMesh=m}setModel(beamModel(a,b,width));const c=hex(col);gl.uniform4f(loc.color,c[0],c[1],c[2],1);gl.uniform1f(loc.glow,glow*.55);gl.uniform1f(loc.mat,mat);drawCalls++;gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0)}
function noise(n){const v=Math.sin(n*133.61+37.13)*43758.5;return v-Math.floor(v)}
const structures=[],smallProps=[];
for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){if(pathSet.has(c+','+r))continue;const id=c*71+r*97,u=noise(id);const near=path.some(([px,pz])=>Math.abs(px-c)+Math.abs(pz-r)<2);if(u>.78&&!near){let p=w(c,r);structures.push({x:p.x,z:p.z,h:1.5+noise(id+12)*3.3,style:Math.floor(noise(id+38)*4),a:id})}else if(u>.65||u<.055){let p=w(c,r);smallProps.push({x:p.x+((noise(id+19)-.5)*.6),z:p.z+((noise(id+11)-.5)*.6),style:Math.floor(noise(id+29)*3)})}}
const roadShapes=path.map(([c,r],i)=>{let p=w(c,r),p0=path[Math.max(0,i-1)],p1=path[Math.min(path.length-1,i+1)],hor=Math.abs(p1[0]-p0[0])>=Math.abs(p1[1]-p0[1]);return{x:p.x,z:p.z,hor}});
const cellTints=[];for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){const p=w(c,r),n=noise(c*117+r*41);cellTints.push({x:p.x,z:p.z,col:n>.65?'#1d2933':n>.33?'#19232c':'#15202a',road:pathSet.has(c+','+r)})}
function scene(){
draw('box',0,-.48,0,COLS*T+.7,.65,ROWS*T+.7,'#0a151c',0,0,1,1);
for(const o of cellTints){draw('box',o.x,-.13,o.z,T-.03,.12,T-.03,o.road?'#111b23':o.col,0,0,1,1);if(o.road)draw('box',o.x,-.018,o.z,T-.15,.09,T-.15,'#28313d',0,0,1,2)}
for(let i=0;i<roadShapes.length;i++){const p=roadShapes[i];draw('box',p.x,.033,p.z,p.hor?.70:.065,.014,p.hor?.065:.70,'#9db0ba',0,.65);if(i%4===0)draw('box',p.x,.052,p.z,p.hor?1.2:.09,.028,p.hor?.09:1.2,'#4c6978',0,.9)}
for(const b of structures){const s=b.style,c=b.h;draw('box',b.x,.02,b.z,1.77,.03,1.77,'#080f17',0,0,.22);draw('box',b.x,c/2,b.z,1.43,c,1.43,s===0?'#2b3b46':s===1?'#29313d':s===2?'#35404a':'#263943');draw('box',b.x,c+.09,b.z,1.5,.18,1.5,'#0c1b26');draw('box',b.x,c+.18,b.z,1.28,.035,1.28,'#546e78',0,.23);if(b.a%4===0){draw('cyl',b.x+.36,c+.48,b.z-.2,.055,.61,.055,'#92a5ac');draw('sphere',b.x+.36,c+.81,b.z-.2,.17,.17,.17,'#9fb6bb',0,.35)}if(b.a%3===0)draw('box',b.x,c+.24,b.z,.65,.26,.67,'#4e6874');for(let k=0;k<Math.floor(c/.58);k++)for(let f of [-1,1]){if(noise(b.a+k*13+f*11)>.54){draw('box',b.x+f*.727,.45+k*.57,b.z+(noise(k+b.a)*.75-.375),.026,.19,.25,(s===2?'#c18bab':s===1?'#d1af8c':s===3?'#aca5d1':'#86b4bd'),0,.40)}if(noise(b.a+k*9+f*19)>.52)draw('box',b.x+(noise(k*2+b.a)-.5)*.8,.45+k*.57,b.z+f*.727,.23,.19,.028,(s===1?'#c2a47e':s===3?'#a8a1cb':'#7b9eaf'),0,.33)}}
for(const p of smallProps){if(p.style===0){draw('cyl',p.x,.24,p.z,.42,.45,.42,'#607683');draw('cyl',p.x,.51,p.z,.45,.08,.45,'#344450')}else if(p.style===1){draw('box',p.x,.28,p.z,.8,.56,.67,'#455564');draw('box',p.x,.62,p.z,.6,.06,.51,'#92bcd0')}else{draw('cyl',p.x,.36,p.z,.12,.72,.12,'#536b78');draw('sphere',p.x,.81,p.z,.26,.26,.26,'#9fb7c8',0,.32)}}
for(let i=0;i<roadShapes.length;i+=4){const p=roadShapes[i],sign=w(path[i][0],path[i][1]);draw('box',sign.x+.65,.06,sign.z+.54,.18,.04,.18,'#7fbccd',0,.85)}
for(let i=0;i<20;i++){let c=i,r=0,p=w(c,r);draw('box',p.x,.32,p.z,T*.85,.7,.16,'#26313b');p=w(c,11);draw('box',p.x,.32,p.z,T*.85,.7,.16,'#26313b')}
const a=w(0,3),b=w(19,5);draw('box',a.x-T*.37,.65,a.z,.33,1.3,1.25,'#753a49');draw('box',b.x+T*.38,.87,b.z,.4,1.72,1.75,'#536676');draw('box',b.x+T*.36,1.8,b.z,1.1,.18,1.8,'#94aebd',0,.40);

// Stage 3: layered brutalist facades, illuminated architectural fins, roof machinery,
// service pipes, conduit, rooftop antennas, pavement grates and neon projections.
for(const b of structures){
 const h=b.h,idx=Math.abs(b.a),accent=['#ce5ca4','#55ddeb','#e9ae63','#9774d4','#56b9a2'][idx%5];
 for(let k=0;k<4;k++){
   const yy=.43+(k+.35)*h/4;
   draw('box',b.x-.70,yy,b.z, .045,.028,1.46,'#556a7b',0,.06);
   draw('box',b.x+.70,yy,b.z, .045,.028,1.46,'#556a7b',0,.06);
 }
 for(const side of [-1,1]){
   draw('box',b.x+side*.70,h*.54,b.z-.5,.11,h*.95,.085,idx%2?'#506475':'#36475a');
   if(idx%3!==1)draw('box',b.x+side*.765,h*.65,b.z-.52,.048,h*.65,.068,accent,0,.58);
 }
 if(idx%3===0){
   draw('box',b.x,h*.58,b.z+.75,.87,.32,.12,'#101827');
   draw('box',b.x,h*.58,b.z+.825,.73,.09,.05,accent,0,.7);
   for(let k=0;k<5;k++)draw('box',b.x-.29+k*.15,h*.58,b.z+.85,.06,.06,.03,'#9aafb9',0,.28);
 }
 draw('box',b.x+.26,h+.30,b.z-.17,.46,.21,.45,'#546673');
 for(let j=0;j<3;j++)draw('box',b.x+.10+j*.15,h+.42,b.z-.17,.025,.03,.36,'#90a0aa');
 if(idx%4===0){
   draw('cyl',b.x-.42,h+.48,b.z+.23,.075,.83,.075,'#81919f');
   draw('sphere',b.x-.42,h+.95,b.z+.23,.13,.16,.13,accent,0,.66);
 }
 if(idx%2===0)draw('box',b.x+.10,.16,b.z+.76,1.05,.27,.035,'#0d151d');
}
for(let i=0;i<roadShapes.length;i+=2){
 const p=roadShapes[i];
 if(i%4===0){draw('box',p.x+.60,.059,p.z-.55,.16,.018,.37,'#0f1921');draw('box',p.x+.60,.076,p.z-.55,.085,.01,.25,'#768c9d',0,.13)}
 if(i%6===0){draw('box',p.x-.59,.045,p.z+.54,.17,.018,.20,'#2a3d4b');draw('box',p.x-.59,.061,p.z+.54,.1,.008,.1,'#8996a0',0,.1)}
}
for(let i=0;i<roadShapes.length;i+=7){
 const p=roadShapes[i],dir=p.hor?1:0,accent=['#57e4ff','#fc5db9','#ffc557'][i%3];
 const xx=p.x+(dir?0:.85),zz=p.z+(dir?.85:0);
 draw('cyl',xx,1.14,zz,.085,2.25,.085,'#738392');
 draw('box',xx,2.31,zz,.50,.12,.31,'#354b5b');
 draw('box',xx,2.31,zz,.4,.065,.25,accent,0,.75);
 draw('sphere',xx,2.17,zz,.20,.13,.20,accent,0,.38,.78);
}


// Night City color pass: bold emissive billboards, layered luminous edges,
// pedestrian signal blocks and color-coded warning rails. Real geometry, not an overlay.
const cyber=['#55ddeb','#a6eaf2','#e9ae63','#9774d4','#56b9a2','#dc626a'];
for(let i=0;i<structures.length;i++){
 const b=structures[i],col=cyber[(i+Math.floor(noise(b.a)*5))%cyber.length];
 if(i%7===0){
   const front=b.z+.79;
   draw('box',b.x,b.h*.62,front,1.02,.68,.13,'#14172a');
   draw('box',b.x,b.h*.62,front+.075,.90,.52,.065,col,0,.64);
   draw('box',b.x,b.h*.62,front+.12,.68,.20,.047,'#b0ced7',0,.4);
   draw('box',b.x,b.h*.62+.19,front+.12,.78,.046,.05,'#1d2238');
   draw('box',b.x,b.h*.62-.19,front+.12,.78,.046,.05,'#1d2238');
 }
 if(i%6===0){
  for(let t=0;t<2;t++){
   draw('box',b.x-.63+t*.63,.3,b.z-.73,.38,.18,.07,col,0,.52);
   draw('box',b.x-.63+t*.63,.49,b.z-.73,.35,.025,.06,'#9bafbd',0,.3);
  }
 }
 if(i%9===0){
  draw('cyl',b.x,b.h+.32,b.z,.10,.38,.10,'#8494ac');
  draw('sphere',b.x,b.h+.62,b.z,.40,.18,.40,col,0,.70);
  draw('ring',b.x,b.h+.60,b.z,1.06,.11,1.06,col,0,.70);
 }
}
for(let i=0;i<roadShapes.length;i++){
 const p=roadShapes[i],col=cyber[Math.floor(i/8)%cyber.length];
 if(i%6===0){
  draw('box',p.x+(p.hor?0:.60),.08,p.z+(p.hor?.60:0),p.hor?1.28:.08,.065,p.hor?.08:1.28,col,0,.55);
  draw('box',p.x-(p.hor?0:.60),.07,p.z-(p.hor?.60:0),p.hor?1.05:.055,.035,p.hor?.055:1.05,col,0,.32);
 }
 if(i%7===0){
  draw('box',p.x+.28,.065,p.z+.34,.33,.035,.14,'#d8ac72',0,.35);
  draw('box',p.x-.32,.065,p.z-.28,.22,.02,.16,'#83bfc9',0,.35);
 }
}
for(let i=0;i<smallProps.length;i++){
 if(i%4!==0)continue;const p=smallProps[i],col=cyber[i%cyber.length];
 draw('cyl',p.x,.17,p.z,.28,.12,.28,'#32414c');
 draw('ring',p.x,.28,p.z,.59,.07,.59,col,0,.7);
 draw('sphere',p.x,.42,p.z,.16,.16,.16,col,0,.7);
}
// Service district: stepped roofs, cooling stacks, fire ladders and perimeter crash barriers.
for(const b of structures){
 const id=Math.abs(b.a),h=b.h;
 if(id%3===0){draw('housing',b.x-.32,h+.38,b.z+.25,.52,.65,.52,'#52616b');draw('cyl',b.x-.32,h+.75,b.z+.25,.44,.08,.44,'#202832');}
 if(id%4===1){draw('box',b.x,h+.34,b.z,1.04,.67,.78,'#303d48');draw('box',b.x,h+.70,b.z,1.16,.08,.90,'#697984');}
 if(id%2===0){for(const side of [-1,1])draw('cyl',b.x+side*.24,h*.5,b.z+.79,.055,h,.055,'#66717c');for(let j=0;j<h/.22;j++)draw('box',b.x,.18+j*.22,b.z+.80,.51,.035,.05,'#66717c');}
 if(id%5===0){draw('box',b.x-.73,.65,b.z-.45,.08,1.15,.36,'#202832');for(let j=0;j<4;j++)draw('box',b.x-.78,.3+j*.22,b.z-.45,.03,.04,.29,'#819099');}
}
for(let i=0;i<roadShapes.length;i+=5){const p=roadShapes[i];draw('cyl',p.x+.50,.05,p.z+.38,.34,.025,.34,'#3b4b59');for(let k=0;k<3;k++)draw('box',p.x+.43+k*.065,.068,p.z+.38,.025,.008,.23,'#10151c');}
// Wrecked service vehicle outside the playable grid: distinct hood, cabin, axles, wheel hubs.
for(const side of [-1,1]){const x=side*12,z=-ROWS*T*.5-.45;draw('box',x,.39,z,2.7,.38,1.04,'#3b4b59');draw('housing',x-.15,.78,z,1.35,.63,.97,'#303b43');draw('box',x-.15,.90,z+.49,.85,.28,.035,'#243e49',0,0,1,6);for(const dx of [-.86,.86])for(const dz of [-.50,.50]){draw('sphere',x+dx,.25,z+dz,.51,.51,.21,'#202832',0,0,1,5);draw('sphere',x+dx,.25,z+dz*1.05,.24,.24,.06,'#71808a');}}

}

// Bake thousands of immutable city meshes into a small number of large GPU batches.
// This moves static vertex transforms out of the render loop, especially important at 120/144 Hz.
function bakeCity(){
 staticCapture=[];scene();const calls=staticCapture;staticCapture=null;
 const groups=new Map(),chunks=[];let primitives=0;
 for(const item of calls){const m=meshes[item.name],key=item.col+'|'+item.glow+'|'+item.alpha+'|'+item.mat;
 let gr=groups.get(key);if(!gr||gr.vertices.length/3+m.cpuV.length/3>=57000){gr={col:item.col,glow:item.glow,alpha:item.alpha,mat:item.mat,vertices:[],normals:[],indices:[]};groups.set(key,gr);chunks.push(gr)}
 const start=gr.vertices.length/3,mt=model(item.x,item.y,item.z,item.sx,item.sy,item.sz,item.rot);
 for(let j=0;j<m.cpuV.length;j+=3){const x=m.cpuV[j],y=m.cpuV[j+1],z=m.cpuV[j+2];gr.vertices.push(mt[0]*x+mt[8]*z+mt[12],mt[5]*y+mt[13],mt[2]*x+mt[10]*z+mt[14]);const nx=m.cpuN[j],ny=m.cpuN[j+1],nz=m.cpuN[j+2];gr.normals.push(mt[0]*nx/(item.sx*item.sx||1)+mt[8]*nz/(item.sz*item.sz||1),ny/(item.sy||1),mt[2]*nx/(item.sx*item.sx||1)+mt[10]*nz/(item.sz*item.sz||1))}
 for(const idx of m.cpuI)gr.indices.push(start+idx);primitives++;
 }
 return{batches:chunks.map(gr=>({mesh:mesh(gr.vertices,gr.normals,gr.indices),col:gr.col,glow:gr.glow,alpha:gr.alpha,mat:gr.mat})),primitives};
}
const bakedCity=bakeCity();
function renderCity(){
 const I=identity();setModel(I);
 for(const batch of bakedCity.batches){const m=batch.mesh;
 if(m!==lastMesh){gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);lastMesh=m}
 const col=hex(batch.col);gl.uniform4f(loc.color,col[0],col[1],col[2],batch.alpha);gl.uniform1f(loc.glow,batch.glow*.55);gl.uniform1f(loc.mat,batch.mat||1);drawCalls++;gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
 }
}
let renderPass='main';
function tower3d(t){
 if(renderPass==='shadow'){draw('housing',t.x,.5,t.z,1.4,1,1.4,'#202832');draw('housing',t.x,1.3,t.z,.85,.65,.85,'#202832');if(t.type!=='bank'&&t.type!=='arc')line3({x:t.x,y:1.3,z:t.z},{x:t.x+Math.sin(t.aim)*1.65,y:1.3,z:t.z+Math.cos(t.aim)*1.65},.25,'#202832');return;}
 const accent=DEF[t.type].color,a=t.aim,c=Math.cos(a),sn=Math.sin(a),hi=graphicMode!=='speed'&&renderPass==='main'&&(smoothZoom<45||graphicMode==='ultra'||graphicMode==='cinematic'),rank=t.level-1,skin=mods(t).skin;
 const pt=(x,y,z)=>({x:t.x+c*x+sn*z,y,z:t.z-sn*x+c*z});
 const part=(m,x,y,z,sx,sy,sz,col,glow=0,mat=0,rot=a)=>{const p=pt(x,y,z);draw(m,p.x,p.y,p.z,sx,sy,sz,col,rot,glow,1,mat)};
 const pipe=(from,to,w,col='#617783',glow=0,mat=3)=>line3(pt(...from),pt(...to),w,col,glow,mat);
 const barrel=(x,y,z,length,width,col='#3b4b59')=>{const m=beamModel(pt(x,y,z),pt(x,y,z+length),width),me=meshes.barrel;bindMesh(me);setModel(m);const rgb=hex(col);gl.uniform4f(loc.color,...rgb,1);gl.uniform1f(loc.glow,0);gl.uniform1f(loc.mat,3);drawCalls++;gl.drawElements(gl.TRIANGLES,me.count,gl.UNSIGNED_SHORT,0)};
 part('housing',0,.18,0,1.55,.36,1.55,'#202832',0,0);
 for(const side of [-1,1])for(const z of [-.47,.47]){part('box',side*.58,.19,z,.28,.22,.32,'#3b4b59');if(hi)part('cyl',side*.58,.32,z,.09,.05,.09,'#a5afb5',0,3)}
 part('cyl',0,.43,0,1.05,.15,1.05,'#10151c');part('housing',0,.68,0,.81,.49,.81,'#3b4b59');
 part('box',0,.37,-.61,.36,.07,.07,accent,.9);
 // Upgrades are armor, heatsinks and structural outriggers, rather than luminous rings.
 for(let i=0;i<rank;i++)for(const side of [-1,1]){part('box',side*(.53+i*.055),.62+i*.12,-.12,.16,.31,.70,'#4d5e6a');if(hi)pipe([side*.57,.35,-.45],[side*.57,.85,.15],.065)}
 const recoil=Math.min(.18,t.flash*1.4),charge=Math.max(0,1-t.cool/1.6);
 if(t.type==='bank'){
  part('housing',0,1.04,0,.95,.9,.95,'#26343b');part('sphere',0,1.48,0,.48,.68,.48,accent,1.1,6);
  for(let i=0;i<4;i++){const th=i*PI/2,xx=Math.cos(th)*.51,zz=Math.sin(th)*.51;part('housing',xx,1.12,zz,.22,1.15,.22,'#819099');pipe([xx,.65,zz],[xx,1.76,zz],.065,accent,.6)}
  part('housing',0,1.87,0,.97,.25,.97,'#3b4b59');
  for(let i=0;i<3;i++){const th=elapsed*.65+i*PI*2/3;part('housing',Math.cos(th)*.42,1.48,Math.sin(th)*.42,.16,.26,.16,'#a6eaf2',.4)}
  for(let i=0;i<rank+skin;i++)part('box',-.54+i*.18,.50,-.51,.12,.33,.2,'#80908e');return;
 }
 part('housing',0,1.04,0,1.05,.51,.94,'#3b4b59',0,0);part('box',0,1.30,-.13,.61,.12,.60,'#7d8a93',0,7);
 for(const side of [-1,1]){part('housing',side*.43,1.12,-.1,.24,.4,.46,'#202832');if(hi)for(let j=0;j<4;j++)part('box',side*.38,1.36,-.33+j*.13,.20,.04,.035,'#10151c')}
 if(t.type==='gun'){
  barrel(0,1.17,.25-recoil,1.2+rank*.11,.30);part('box',0,1.39,.3,.23,.12,.41,'#202832');part('box',0,1.42,.51,.10,.04,.12,accent,.8);
  for(const side of [-1,1])pipe([side*.30,1.00,.1],[side*.21,1.15,.65],.1);
 }else if(t.type==='mg'){
  for(let i=0;i<6;i++){const th=i*PI/3+elapsed*(t.flash>0?22:1);barrel(Math.cos(th)*.19,1.19+Math.sin(th)*.19,.28-recoil,1.32,.11,'#82929b')}
  part('housing',-.56,1.10,-.12,.47,.58,.49,'#6d6556');pipe([-.48,1.34,-.1],[-.23,1.28,.28],.17,'#8f856d');
 }else if(t.type==='rail'){
  for(const side of [-1,1]){part('box',side*.23,1.18,1.0-recoil,.17,.22,1.85,'#414151',0,7);for(let j=0;j<5;j++)part('housing',side*.25,1.18,.36+j*.27,.21,.33,.13,accent,.25+charge*.3)}
  pipe([0,1.18,.25],[0,1.18,1.85],.055,accent,1.2);
 }else if(t.type==='cryo'){
  for(const side of [-1,1]){part('housing',side*.50,1.22,-.32,.31,.95,.31,'#a6bec4',0,7);pipe([side*.5,.88,-.32],[side*.30,1.2,.52],.09,'#718c96');part('box',side*.51,1.25,-.49,.10,.33,.03,accent,.7)}
  barrel(0,1.2,.23,1.02,.49,'#9bb6c2');part('sphere',0,1.2,1.28,.27,.27,.10,accent,1.1,6);
 }else if(t.type==='mortar'){
  const base=pt(0,1.2,.1),tip=pt(0,2.25-recoil,.65);line3(base,tip,.57,'#53606c');part('cyl',0,2.24-recoil,.65,.58,.12,.58,'#10151c',0,5);
  for(const side of [-1,1]){pipe([side*.52,.6,-.22],[side*.32,1.65,.34],.14);part('housing',side*.50,1.03,-.35,.26,.75,.26,'#736352')}
 }else if(t.type==='arc'){
  for(const side of [-1,1]){part('cyl',side*.40,1.60,0,.12,1.2,.12,'#52566a',0,7);for(let j=0;j<6;j++)part('ring',side*.4,1.22+j*.14,0,.39,.10,.39,'#9b8b77',0,3);part('sphere',side*.4,2.22,0,.29,.29,.29,'#c2c9cf',.3)}
  part('housing',0,1.42,.15,.3,.65,.3,'#59647f');if(hi&&t.flash>0)pipe([-.4,2.22,0],[.4,2.22,0],.028,accent,2);
 }else if(t.type==='flame'){
  for(const side of [-1,1]){part('housing',side*.5,1.18,-.42,.33,.95,.33,'#735647');part('box',side*.5,1.16,-.59,.36,.12,.06,'#202832');pipe([side*.5,.83,-.42],[side*.26,1.13,.62],.10,'#282e32')}
  barrel(0,1.15,.26,1.13,.46,'#8b7c6a');for(let j=0;j<4;j++)part('box',0,1.41,.48+j*.18,.44,.05,.04,'#202832');pipe([.15,1.03,1.22],[.15,1.03,1.45],.045,'#e9ae63',1);
 }
 if(t.flash>0){const p=pt(0,t.type==='mortar'?2.36:1.17,t.type==='mortar'?.65:1.65);draw('lowSphere',p.x,p.y,p.z,.22,.18,.4,accent,0,2.5)}
 for(let i=0;i<skin;i++){const side=i%2?1:-1;part('box',side*.58,1.05,-.28+Math.floor(i/2)*.18,.16,.30,.13,'#81939d',0,7);part('box',side*.67,1.14,-.28+Math.floor(i/2)*.18,.025,.06,.09,accent,.8)}
}
function bindMesh(m){if(m===lastMesh)return;gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);lastMesh=m;}
function zombie3d(e){
 if(renderPass==='shadow'){draw('lowSphere',e.x,.8*e.scale,e.z,.7*e.scale,1.5*e.scale,.55*e.scale,'#202832');draw('lowSphere',e.x,1.6*e.scale,e.z,.45*e.scale,.45*e.scale,.45*e.scale,'#202832');return;}
 const s=e.scale,rot=e.angle,hi=graphicMode!=='speed'&&renderPass==='main'&&zombies.length<55&&smoothZoom<45,boss=e.type==='boss',armored=e.type==='armor'||e.type==='bulwark',fast=e.type==='runner'||e.type==='mini'||e.type==='reaper',heavy=boss||e.type==='brute'||e.type==='bulwark';
 const skin=({boss:'#a87578',shadow:'#68778d',runner:'#9ba891',splitter:'#a08094',regen:'#88ac9c'})[e.type]||'#8e9e91',suit=armored?'#536575':boss?'#57323f':'#35433f';
 const phase=e.age*(fast?15:heavy?5.5:8.6)+e.id,walk=Math.sin(phase),bob=Math.abs(Math.cos(phase))*(heavy?.035:.055),lean=(fast?.20:heavy?.06:.09)-(e.hurt||0)*.8;
 const pt=(x,y,z)=>({x:e.x+(Math.cos(rot)*x+Math.sin(rot)*z)*s,y:(y+bob)*s,z:e.z+(-Math.sin(rot)*x+Math.cos(rot)*z)*s});
 const part=(name,x,y,z,sx,sy,sz,col,mat=4,glow=0)=>{const p=pt(x,y,z);draw(hi?name:name==='sphere'?'lowSphere':name,p.x,p.y,p.z,sx*s,sy*s,sz*s,col,rot,glow,1,mat)};
 const limb=(a,b,width,col,mat=4)=>{line3(pt(...a),pt(...b),width*s,col,0,mat);if(hi)part('sphere',...b,width*1.15,width*1.15,width*1.15,col,mat)};
 part('housing',0,.63,0,.50,.30,.34,suit,5);part('sphere',0,1.00,lean,.65,.73,.42,suit,5);part('sphere',0,1.24,lean,.68,.27,.43,skin);
 part('cyl',0,1.39,lean,.19,.18,.19,skin);part('housing',0,1.60,lean+.04,.42,.48,.37,skin);part('housing',0,1.43,lean+.17,.29,.15,.23,skin);
 for(const side of [-1,1]){
  const swing=walk*side,knee=[side*.17,.37,.04+swing*.19],foot=[side*.18,.10,.12+swing*.33];
  limb([side*.16,.65,0],knee,.21,suit,5);limb(knee,foot,.15,armored?'#687887':skin,armored?0:4);part('housing',foot[0],.055,foot[2]+.06,.22,.16,.36,'#202832',5);
  const elbow=[side*.39,.92,lean+.08-swing*.14],hand=[side*(heavy?.52:.42),.70,lean+.28-swing*.23];
  part('sphere',side*.35,1.20,lean,.27,.28,.30,skin);limb([side*.34,1.19,lean],elbow,.18,skin);limb(elbow,hand,.14,skin);part('housing',...hand,.16,.21,.19,skin);
  part('box',side*.105,1.64,lean+.235,.075,.045,.035,e.type==='shadow'?'#55ddeb':'#dc626a',6,.7);
  if(hi)for(let j=0;j<3;j++)part('box',hand[0]+(j-1)*.05,hand[1]-.11,hand[2]+.05,.025,.12,.04,skin);
 }
 if(armored){part('housing',0,1.12,lean,.76,.43,.58,'#697b88',0);part('housing',0,1.72,lean,.53,.24,.46,'#536575',0);for(const side of [-1,1])part('housing',side*.39,1.26,lean,.32,.23,.41,'#697b88',0);if(e.type==='bulwark')part('box',0,.91,.51,.83,.72,.14,'#7d8c98',7)}
 if(heavy){part('sphere',0,1.14,-.09,.96,.60,.65,skin);for(const side of [-1,1]){part('sphere',side*.49,1.21,.04,.44,.44,.43,skin);if(boss)for(let j=0;j<3;j++)part('cone',side*(.43+j*.10),1.51-j*.08,-.12,.15,.43,.15,'#8f626d',7)}}
 if(e.type==='splitter'||e.type==='regen')for(let i=0;i<3;i++)part('sphere',(i-1)*.20,1.03,-.20,.30,.35,.30,e.type==='regen'?'#56b9a2':'#946381',4,.15);
 if(e.type==='shadow'||e.type==='reaper'){part('housing',0,1.73,lean-.06,.56,.28,.47,'#303b4d',5);if(hi)for(const side of [-1,1])limb([side*.42,.74,.35],[side*.45,.45,.61],.055,'#8899aa',3)}
 if(hi){part('box',-.15,1.02,lean+.21,.11,.23,.03,'#87545b');part('box',.17,.92,lean+.21,.14,.10,.025,'#617465');}
 if(e.burn>0)part('sphere',0,.95,0,.55,.75,.55,'#e9ae63',4,.7);
 if(e.slow>0||emp>0)draw('ring',e.x,.08,e.z,1.3*s,.06,1.3*s,'#a6eaf2',0,.5);
 const ratio=Math.max(0,e.hp/e.max);draw('box',e.x,2.10*s,e.z,.86*s,.07*s,.08*s,'#15232a');if(ratio>.002)draw('box',e.x-(1-ratio)*.43*s,2.10*s,e.z+.04*s,.86*s*ratio,.07*s,.08*s,ratio>.5?'#56b9a2':'#dc626a',0,.3);
}
const PRESETS={speed:{scale:.85,mirror:0,every:6},balanced:{scale:1,mirror:.35,every:4},high:{scale:1.25,mirror:.5,every:2},ultra:{scale:1.5,mirror:.65,every:1},cinematic:{scale:2,mirror:.75,every:1}};
let resizeW=0,resizeH=0,graphicMode='high',resolutionScale=1.2,measuredFPS=0,reflectionEvery=3;function resize(){const r=canvas.getBoundingClientRect(),device=window.devicePixelRatio||1,dpr=Math.min(device,PRESETS[graphicMode].scale),cw=Math.max(2,Math.floor(r.width*dpr)),ch=Math.max(2,Math.floor(r.height*dpr));if(cw!==resizeW||ch!==resizeH){canvas.width=cw;canvas.height=ch;resizeW=cw;resizeH=ch;gl.viewport(0,0,cw,ch)}}

// STAGE 3: true planar-mirror reflection texture + a separate bloom/filmic color grading pipeline.
// All textures and shader passes run locally; no network and no pre-rendered screenshots.
function makeTarget(width,height,depth=false){
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
 let rb=null;if(depth){rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb)}
 const status=gl.checkFramebufferStatus(gl.FRAMEBUFFER);gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(status!==gl.FRAMEBUFFER_COMPLETE)throw Error('Framebuffer not complete: '+status);
 return {fbo,tex,rb,w:width,h:height};
}
function freeTarget(t){if(!t)return;gl.deleteFramebuffer(t.fbo);gl.deleteTexture(t.tex);if(t.rb)gl.deleteRenderbuffer(t.rb)}
const PVS=`attribute vec2 aXY;varying vec2 vUV;void main(){vUV=aXY*.5+.5;gl_Position=vec4(aXY,0.,1.);}`;
const PFS=`precision highp float;varying vec2 vUV;uniform sampler2D uTex;uniform sampler2D uBloom;uniform vec2 uTexel;uniform vec2 uAxis;uniform float uMode;uniform float uStrength;uniform float uTime;
vec3 toneMap(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c;
if(uMode<.5){c=texture2D(uTex,vUV).rgb;float brightness=max(c.r,max(c.g,c.b));c=max(vec3(0.),c-vec3(.72))*smoothstep(.73,1.05,brightness)*.95;}
else if(uMode<1.5){c=texture2D(uTex,vUV).rgb*.227027;for(int k=1;k<=4;k++){float w=k==1?.1945946:k==2?.1216216:k==3?.054054:.016216;c+=texture2D(uTex,vUV+uTexel*uAxis*float(k)).rgb*w;c+=texture2D(uTex,vUV-uTexel*uAxis*float(k)).rgb*w;}}
else{vec3 scene=texture2D(uTex,vUV).rgb;
 // Edge-aware 4-tap anti-aliasing in postprocessing: clean silhouettes without blurring all textures.
 vec3 nn=texture2D(uTex,vUV+vec2(0.,uTexel.y)).rgb;
 vec3 ss=texture2D(uTex,vUV-vec2(0.,uTexel.y)).rgb;
 vec3 ee=texture2D(uTex,vUV+vec2(uTexel.x,0.)).rgb;
 vec3 ww=texture2D(uTex,vUV-vec2(uTexel.x,0.)).rgb;
 float lc=dot(scene,vec3(.299,.587,.114));
 float edgeContrast=max(max(abs(lc-dot(nn,vec3(.299,.587,.114))),abs(lc-dot(ss,vec3(.299,.587,.114)))),max(abs(lc-dot(ee,vec3(.299,.587,.114))),abs(lc-dot(ww,vec3(.299,.587,.114)))));
 scene=mix(scene,(scene*2.+nn+ss+ee+ww)/6.,smoothstep(.075,.27,edgeContrast)*.64);
 vec3 bloom=texture2D(uBloom,vUV).rgb;vec3 combined=scene+bloom*uStrength;combined=pow(toneMap(combined*1.12),vec3(1./2.2));float vignette=1.-.15*dot((vUV-.5)*vec2(1.2,.96),(vUV-.5)*vec2(1.2,.96));combined*=vignette;combined=mix(vec3(dot(combined,vec3(.3,.59,.11))),combined,1.0);c=combined;}
gl_FragColor=vec4(c,1.);}`;
const postProgram=gl.createProgram();gl.attachShader(postProgram,compile(gl.VERTEX_SHADER,PVS));gl.attachShader(postProgram,compile(gl.FRAGMENT_SHADER,PFS));gl.linkProgram(postProgram);if(!gl.getProgramParameter(postProgram,gl.LINK_STATUS))throw Error('Post: '+gl.getProgramInfoLog(postProgram));
const postLoc={xy:gl.getAttribLocation(postProgram,'aXY'),tex:gl.getUniformLocation(postProgram,'uTex'),bloom:gl.getUniformLocation(postProgram,'uBloom'),texel:gl.getUniformLocation(postProgram,'uTexel'),axis:gl.getUniformLocation(postProgram,'uAxis'),mode:gl.getUniformLocation(postProgram,'uMode'),strength:gl.getUniformLocation(postProgram,'uStrength'),time:gl.getUniformLocation(postProgram,'uTime')};
const postVertex=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,postVertex);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
let mirrorTarget=null,sceneTarget=null,blurA=null,blurB=null,reflectionMatrix=identity(),postReady=false,fxCanvasW=0,fxCanvasH=0,graphicsFailed=false,renderedFrames=0;
function ensureTargets(){
 if(graphicMode==='speed'||graphicsFailed)return false;
 if(postReady&&fxCanvasW===canvas.width&&fxCanvasH===canvas.height)return true;
 [mirrorTarget,sceneTarget,blurA,blurB].forEach(freeTarget);mirrorTarget=sceneTarget=blurA=blurB=null;postReady=false;
 try{
 const rw=Math.min(1050,Math.max(320,Math.round(canvas.width*PRESETS[graphicMode].mirror)));
 const rh=Math.min(700,Math.max(190,Math.round(canvas.height*PRESETS[graphicMode].mirror)));
 const bw=Math.max(240,Math.round(canvas.width*.37)),bh=Math.max(140,Math.round(canvas.height*.37));
 mirrorTarget=makeTarget(rw,rh,true);sceneTarget=makeTarget(canvas.width,canvas.height,true);blurA=makeTarget(bw,bh);blurB=makeTarget(bw,bh);
 fxCanvasW=canvas.width;fxCanvasH=canvas.height;postReady=true;return true;
 }catch(err){console.warn('FBO effects unavailable; fallback rendering:',err);[mirrorTarget,sceneTarget,blurA,blurB].forEach(freeTarget);mirrorTarget=sceneTarget=blurA=blurB=null;graphicsFailed=true;return false}
}
function beginPost(dst,w,h,src,other,mode,ax,ay,strength){
 gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.fbo:null);gl.viewport(0,0,w,h);
 gl.useProgram(postProgram);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
 gl.bindBuffer(gl.ARRAY_BUFFER,postVertex);gl.enableVertexAttribArray(postLoc.xy);gl.vertexAttribPointer(postLoc.xy,2,gl.FLOAT,false,0,0);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src.tex);gl.uniform1i(postLoc.tex,0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,other?other.tex:src.tex);gl.uniform1i(postLoc.bloom,1);
 gl.uniform2f(postLoc.texel,1/src.w,1/src.h);gl.uniform2f(postLoc.axis,ax,ay);gl.uniform1f(postLoc.mode,mode);gl.uniform1f(postLoc.strength,strength);gl.uniform1f(postLoc.time,elapsed);
 drawCalls++;gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 gl.disableVertexAttribArray(postLoc.xy);gl.useProgram(program);gl.enableVertexAttribArray(loc.p);gl.enableVertexAttribArray(loc.n);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);lastMesh=null;
}
function postProcess(){
 beginPost(blurA,blurA.w,blurA.h,sceneTarget,null,0,0,0,0);
 beginPost(blurB,blurB.w,blurB.h,blurA,null,1,1,0,0);
 beginPost(blurA,blurA.w,blurA.h,blurB,null,1,0,1,0);
 beginPost(null,canvas.width,canvas.height,sceneTarget,blurA,2,0,0,graphicMode==='cinematic'?.16:graphicMode==='ultra'?.13:.10);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mirrorTarget.tex);gl.uniform1i(loc.reflTex,0);
}

const particleProgram=gl.createProgram();
gl.attachShader(particleProgram,compile(gl.VERTEX_SHADER,`attribute vec3 aPosition;attribute vec3 aColor;attribute float aSize;uniform mat4 uVP;uniform float uPixels;varying vec3 vColor;void main(){gl_Position=uVP*vec4(aPosition,1.);gl_PointSize=clamp(aSize*uPixels/max(.1,gl_Position.w),1.,48.);vColor=aColor;}`));
gl.attachShader(particleProgram,compile(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(pow(vColor,vec3(2.2))*.9,(1.-smoothstep(.25,1.,d))*.85);}`));
gl.linkProgram(particleProgram);if(!gl.getProgramParameter(particleProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(particleProgram));
const particleLoc={p:gl.getAttribLocation(particleProgram,'aPosition'),c:gl.getAttribLocation(particleProgram,'aColor'),s:gl.getAttribLocation(particleProgram,'aSize'),vp:gl.getUniformLocation(particleProgram,'uVP'),px:gl.getUniformLocation(particleProgram,'uPixels')},particleData=new Float32Array(550*7),particleBuffer=gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);gl.bufferData(gl.ARRAY_BUFFER,particleData.byteLength,gl.DYNAMIC_DRAW);
function renderParticles(){
 if(!particles.length)return;const count=Math.min(550,particles.length);
 for(let i=0;i<count;i++){const p=particles[i],col=hex(p.col),o=i*7;particleData[o]=p.x;particleData[o+1]=p.y;particleData[o+2]=p.z;particleData[o+3]=col[0];particleData[o+4]=col[1];particleData[o+5]=col[2];particleData[o+6]=p.size;}
 gl.useProgram(particleProgram);gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,particleData.subarray(0,count*7));
 for(const [loc,n,offset] of [[particleLoc.p,3,0],[particleLoc.c,3,12],[particleLoc.s,1,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,28,offset);}
 gl.uniformMatrix4fv(particleLoc.vp,false,vp);gl.uniform1f(particleLoc.px,canvas.height*1.3);gl.depthMask(false);drawCalls++;gl.drawArrays(gl.POINTS,0,count);gl.depthMask(true);
 for(const loc of [particleLoc.p,particleLoc.c,particleLoc.s])gl.disableVertexAttribArray(loc);
 gl.useProgram(program);gl.enableVertexAttribArray(loc.p);gl.enableVertexAttribArray(loc.n);lastMesh=null;
}
let shadowTarget=null,shadowSize=0,shadowFrame=0;
function renderShadows(){
 if(graphicMode==='speed'){gl.uniform1f(loc.shadowOn,0);return;}
 const size=(graphicMode==='ultra'||graphicMode==='cinematic')?2048:1024;
 if(size===shadowSize&&shadowTarget&&performance.now()-shadowFrame<(towers.length||zombies.length?33:1000))return;shadowFrame=performance.now();
 if(size!==shadowSize){freeTarget(shadowTarget);shadowTarget=makeTarget(size,size,true);shadowSize=size;}
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);
 gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,null);
 gl.bindFramebuffer(gl.FRAMEBUFFER,shadowTarget.fbo);gl.viewport(0,0,size,size);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const eye=[-26,43,15],back=norm(eye),right=norm(cross([0,1,0],back)),up=cross(back,right);
 const view=[... [right[0],up[0],back[0],0],right[1],up[1],back[1],0,right[2],up[2],back[2],0,-dot(right,eye),-dot(up,eye),-dot(back,eye),1];
 const ortho=[1/26,0,0,0,0,1/26,0,0,0,0,-2/100,0,0,0,-1,1],light=mult(ortho,view);
 gl.uniformMatrix4fv(loc.lightVP,false,light);gl.uniformMatrix4fv(loc.vp,false,light);gl.uniform1f(loc.clip,-100);gl.uniform1f(loc.shadowPass,1);gl.uniform1f(loc.shadowOn,0);gl.uniform1f(loc.reflOn,0);gl.disable(gl.BLEND);lastMesh=null;
 renderCity();renderPass='shadow';for(const t of towers)tower3d(t);for(const e of zombies)zombie3d(e);renderPass='main';
 gl.enable(gl.BLEND);gl.uniform1f(loc.shadowPass,0);gl.uniform1f(loc.shadowOn,1);gl.uniform2f(loc.shadowTexel,1/size,1/size);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,shadowTarget.tex);gl.uniform1i(loc.shadowTex,3);gl.activeTexture(gl.TEXTURE0);
}
let drawCalls=0,frameMS=0;
function render(){
 const frameStart=performance.now();drawCalls=0;
 resize();gl.useProgram(program);gl.uniform1f(loc.time,elapsed);
 const flashTower=towers.find(t=>t.flash>0);const blast=explosions.find(e=>e.ttl>.35);
 if(blast)gl.uniform4f(loc.flash,blast.x,1.6,blast.z,Math.min(2,blast.ttl*4));else if(flashTower)gl.uniform4f(loc.flash,flashTower.x,1.5,flashTower.z,flashTower.flash*8);else gl.uniform4f(loc.flash,0,0,0,0);
 const useFX=ensureTargets();gl.uniform1f(loc.direct,0);gl.uniform1f(loc.shadowOn,graphicMode==='speed'?0:1);renderShadows();
 if(useFX){
  // Mirrored viewpoint: actual scene geometry rendered into a reflection framebuffer.
  // Omit all geometry below .23m (ground/roads) to prevent self-reflection.
  if(renderedFrames%reflectionEvery===0||!renderedFrames||cameraMoving){
   // Detach any stale mirror texture bindings before rendering into that texture.
   // WebGL forbids framebuffer/texture feedback loops even when the shader branch skips sampling.
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,null);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindFramebuffer(gl.FRAMEBUFFER,mirrorTarget.fbo);gl.viewport(0,0,mirrorTarget.w,mirrorTarget.h);
   gl.clearColor(.018,.024,.034,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   camera(true);reflectionMatrix=vp.slice();gl.uniform1f(loc.clip,.23);gl.uniform1f(loc.reflOn,0.);lastMesh=null;
   renderCity();renderPass='reflection';for(const t of towers)tower3d(t);
   if(zombies.length<28){for(const e of zombies)zombie3d(e)}renderPass='main';
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,sceneTarget.fbo);gl.viewport(0,0,sceneTarget.w,sceneTarget.h);
 }else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height)}
 gl.clearColor(.003,.006,.010,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 camera(false);gl.uniform1f(loc.direct,useFX?0:1);gl.uniform1f(loc.clip,-100.);gl.uniform1f(loc.reflOn,useFX?1.:0.);
 gl.uniformMatrix4fv(loc.reflVP,false,new Float32Array(reflectionMatrix));
 if(useFX){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mirrorTarget.tex);gl.uniform1i(loc.reflTex,0)}
 lastMesh=null;
renderCity();
if(selected&&towers.includes(selected)){draw('hairline',selected.x,.13,selected.z,1.63,.048,1.63,'#a6d8e7',0,0,.52)}
if(hover&&!over){if(ability==='bomb'){draw('ring',hover.x,.15,hover.z,T*4.9,.13,T*4.9,'#ffd1a3',0,1.8);draw('sphere',hover.x,.15,hover.z,.38,.13,.38,'#ffce9c',0,2)}else if(build&&hover.c>=0&&hover.c<COLS&&hover.r>=0&&hover.r<ROWS){let can=!pathSet.has(hover.c+','+hover.r)&&!towers.some(t=>t.c===hover.c&&t.r===hover.r)&&money>=DEF[build].cost;draw('box',w(hover.c,hover.r).x,.16,w(hover.c,hover.r).z,1.64,.1,1.64,can?'#7dc3d5':'#e37a81',0,1,.6);if(can&&DEF[build].range)draw('hairline',w(hover.c,hover.r).x,.18,w(hover.c,hover.r).z,DEF[build].range*T*2,.05,DEF[build].range*T*2,'#7cb8c7',0,0,.38)}}
for(const t of towers)tower3d(t);for(const e of zombies)zombie3d(e);for(const body of corpses){const f=1-body.ttl/.65;draw('housing',body.x,.28*body.scale*(1-f),body.z,.65*body.scale,.4*body.scale*(1-f),1.3*body.scale,'#35433f',body.angle+f*.4,0,1-f,4);}
for(const b of bullets){if(b.px!==undefined&&graphicMode!=='speed')line3({x:b.px,y:b.py,z:b.pz},{x:b.x,y:b.y,z:b.z},b.type==='rail'?.13:.09,b.critical?'#fff5cc':b.color,1.8);draw('sphere',b.x,b.y,b.z,b.type==='rail'?.24:.18,.17,.18,b.critical?'#fff5cf':b.color,0,2.7)}
for(const beam of beams){line3(beam.a,beam.b,.07,beam.color,1.8)}
for(const r of explosions){const f=1-r.ttl/r.total;draw('ring',r.x,.18,r.z,r.radius*2*f,.14,r.radius*2*f,r.color,0,2)}
renderParticles();
if(emp>0){draw('ring',0,.14,0,(COLS*T-1),.12,(ROWS*T-1),'#9eeeff',0,1.2)}
if(useFX)postProcess();renderedFrames++;frameMS=performance.now()-frameStart;root.dataset.frameMs=frameMS.toFixed(2);root.dataset.drawCalls=drawCalls;root.dataset.frames=renderedFrames;
}
function pick(e){const b=canvas.getBoundingClientRect(),ndcx=((e.clientX-b.left)/b.width)*2-1,ndcy=1-((e.clientY-b.top)/b.height)*2;if(!camBasis)return null;const tan=Math.tan(PI/8.4),{eye,right,up,forward,aspect}=camBasis,d=norm([forward[0]+right[0]*ndcx*tan*aspect+up[0]*ndcy*tan,forward[1]+right[1]*ndcx*tan*aspect+up[1]*ndcy*tan,forward[2]+right[2]*ndcx*tan*aspect+up[2]*ndcy*tan]);if(d[1]>=-.0001)return null;const ti=-eye[1]/d[1],x=eye[0]+d[0]*ti,z=eye[2]+d[2]*ti,c=cell(x,z);return{x,z,c:c.c,r:c.r}}
let down=null;canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;down={x:e.clientX,y:e.clientY,yaw,pitch,drag:false};try{canvas.setPointerCapture(e.pointerId)}catch(err){};});
canvas.addEventListener('pointermove',e=>{if(down){let dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>7)down.drag=true;if(down.drag){yaw=down.yaw-dx*.007;pitch=Math.max(.42,Math.min(1.45,down.pitch+dy*.004));hover=null}return}hover=pick(e)});
canvas.addEventListener('pointerup',e=>{if(!down)return;let p=down;down=null;if(p.drag||over||paused||e.button===2)return;const v=pick(e);if(!v)return;if(ability==='bomb')orbital(v.x,v.z);else place(v.c,v.r);root.focus({preventScroll:true})});
canvas.addEventListener('pointercancel',()=>{down=null});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerleave',()=>{if(!down)hover=null});canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(21,Math.min(69,zoom*Math.exp(e.deltaY*.0011)))},{passive:false});
$('#n-full').onclick=async()=>{try{if(document.fullscreenElement===root)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else toast('ПОЛНОЭКРАННЫЙ РЕЖИМ НЕ ПОДДЕРЖИВАЕТСЯ')}catch(_){toast('БРАУЗЕР НЕ РАЗРЕШИЛ ПОЛНЫЙ ЭКРАН')}};
document.addEventListener('fullscreenchange',()=>{$('#n-full').textContent=document.fullscreenElement===root?'⛶ Выйти':'⛶ Экран';resize()});
$('#n-quality').onchange=e=>{graphicMode=e.target.value;reflectionEvery=PRESETS[graphicMode].every;postReady=false;renderedFrames=0;resizeW=-1;toast('ГРАФИКА: '+e.target.options[e.target.selectedIndex].text)};
$('#n-fpscap').onchange=e=>{toast(e.target.value==='0'?'ОГРАНИЧЕНИЕ FPS СНЯТО':'ЦЕЛЬ: ДО '+e.target.value+' FPS · ЗАВИСИТ ОТ МОНИТОРА')};
$('#n-inspect').onclick=()=>{if(!selected){toast('ВЫБЕРИ БАШНЮ ДЛЯ ОСМОТРА');return}inspecting=!inspecting;zoom=inspecting?24:55;pitch=inspecting?.70:1.09;};
$('#n-left').onclick=()=>yaw-=.28;$('#n-right').onclick=()=>yaw+=.28;$('#n-in').onclick=()=>zoom=Math.max(21,zoom-5);$('#n-out').onclick=()=>zoom=Math.min(69,zoom+5);$('#n-camreset').onclick=()=>{inspecting=false;yaw=-.68;pitch=1.09;zoom=55};
root.querySelectorAll('.item').forEach(el=>el.onclick=()=>{choose(el.dataset.type);root.focus({preventScroll:true})});
root.querySelectorAll('.mod').forEach(b=>b.onclick=()=>modify(b.dataset.mod));$('#n-up').onclick=upgrade;$('#n-sell').onclick=sell;$('#n-target').onclick=priority;
$('#n-bomb').onclick=()=>{if(money<150||over)return;ability=ability==='bomb'?null:'bomb';selected=null;build=null;toast(ability?'ВЫБЕРИ МЕСТО ОРБИТАЛЬНОГО УДАРА':'ОРБИТАЛЬНЫЙ УДАР ОТМЕНЁН');hud()};
$('#n-emp').onclick=freeze;$('#n-boost').onclick=overdrive;$('#n-repair').onclick=repair;$('#n-start').onclick=start;
$('#n-pause').onclick=()=>{if(over)return;paused=!paused;hud();toast(paused?'Ⅱ ПАУЗА':'▶ ВОСПРОИЗВЕДЕНИЕ',1)};
$('#n-speed').onclick=()=>{speed=speed===1?2:speed===2?3:1;hud()};$('#n-sound').onclick=()=>{sounds=!sounds;$('#n-sound').textContent=sounds?'♪ ЗВУК':'♪ ВЫКЛ.';if(sounds){tone(690,.06);unlockMusic()}};$('#n-music').onclick=()=>{musicEnabled=!musicEnabled;$('#n-music').textContent=musicEnabled?'♫ МУЗЫКА':'♫ ВЫКЛ.';if(musicEnabled)unlockMusic()};
root.addEventListener('pointerdown',unlockMusic,{once:true});$('#n-restart').onclick=reset;$('#n-difficulty').onchange=e=>{difficulty=Number(e.target.value);toast('УРОВЕНЬ УГРОЗЫ: '+e.target.options[e.target.selectedIndex].text)};
root.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;const type=Object.keys(DEF);if(/^[1-8]$/.test(e.key)){choose(type[+e.key-1]);e.preventDefault()}else if(e.key===' '){if(paused){paused=false;hud()}else start();e.preventDefault()}else if(e.key.toLowerCase()==='q'){$('#n-bomb').click();e.preventDefault()}else if(e.key.toLowerCase()==='w'){freeze();e.preventDefault()}else if(e.key.toLowerCase()==='e'){overdrive();e.preventDefault()}else if(e.key.toLowerCase()==='r'){repair();e.preventDefault()}else if(e.key.toLowerCase()==='u'){upgrade();e.preventDefault()}else if(e.key.toLowerCase()==='f'&&!e.repeat){$('#n-full').click();e.preventDefault()}else if(e.key==='Escape'){selected=null;build=null;ability=null;hud()}else if(e.key==='ArrowLeft'){yaw-=.15;e.preventDefault()}else if(e.key==='ArrowRight'){yaw+=.15;e.preventDefault()}});
let intervals=[],last=0,lastRendered=0,fpsFrames=0,fpsStart=0,lag=0;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.enableVertexAttribArray(loc.p);gl.enableVertexAttribArray(loc.n);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
function tick(ts){
 const delta=Math.min(.25,last?(ts-last)/1000:.016);last=ts;musicLoop();
 const ease=1-Math.exp(-delta*14);cameraMoving=Math.abs(yaw-smoothYaw)+Math.abs(pitch-smoothPitch)+Math.abs(zoom-smoothZoom)>.001;smoothYaw+=(yaw-smoothYaw)*ease;smoothPitch+=(pitch-smoothPitch)*ease;smoothZoom+=(zoom-smoothZoom)*ease;const fx=inspecting&&selected?selected.x:0,fz=inspecting&&selected?selected.z:0;if(Math.abs(fx-focusX)+Math.abs(fz-focusZ)>.001)cameraMoving=true;focusX+=(fx-focusX)*ease;focusZ+=(fz-focusZ)*ease;lag+=delta;
 const fixed=1/120;let count=0;while(lag>=fixed&&count<30){step(fixed*speed);lag-=fixed;count++}if(count>=30)lag=0;
 const cap=Number($('#n-fpscap').value)||0,minGap=cap?1000/cap:0;
 if(minGap===0||ts-lastRendered>=minGap-.45){
  if(lastRendered){intervals.push(ts-lastRendered);if(intervals.length>120)intervals.shift()}lastRendered=ts;render();fpsFrames++;root.dataset.frameP95=(intervals.length?intervals.slice().sort((a,b)=>a-b)[Math.floor((intervals.length-1)*.95)]:0).toFixed(1);
  if(!fpsStart)fpsStart=ts;
  if(ts-fpsStart>=800){measuredFPS=Math.round(fpsFrames*1000/(ts-fpsStart));$('#n-fps').textContent='FPS: '+measuredFPS+' · '+graphicMode.toUpperCase()+' · '+frameMS.toFixed(1)+' ms CPU · '+drawCalls+' draws';
   if(graphicMode==='auto'){const before=resolutionScale;if(measuredFPS<42)resolutionScale=Math.max(.8,resolutionScale-.12);else if(measuredFPS>58)resolutionScale=Math.min(1.65,resolutionScale+.06);if(before!==resolutionScale)resizeW=-1}
   fpsFrames=0;fpsStart=ts;
  }
 }
 frameId=requestAnimationFrame(tick);
}
reset();requestAnimationFrame(tick);
})();
