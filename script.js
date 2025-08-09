/* script.js - reduced petal effect, customizable background, poem, and LRC lyrics sync */
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const intro = document.getElementById('intro');
const stage = document.getElementById('stage');
const petalCanvas = document.getElementById('petalCanvas');
const ctx = petalCanvas.getContext('2d');
const coverFlower = document.getElementById('coverFlower');
const bgPath = document.getElementById('bgPath');
const useBgFile = document.getElementById('useBgFile');
const bgUpload = document.getElementById('bgUpload');
const poemEl = document.getElementById('poem');
const audio = document.getElementById('audio');
const musicName = document.getElementById('musicName');
const loadMusic = document.getElementById('loadMusic');
const togglePlay = document.getElementById('togglePlay');
const lyricsContainer = document.getElementById('lyrics');
const lrcPath = document.getElementById('lrcPath');
const useLrcPath = document.getElementById('useLrcPath');
const lrcUpload = document.getElementById('lrcUpload');
const photoUpload = document.getElementById('photoUpload');
const addFromRepo = document.getElementById('addFromRepo');
const thumbs = document.getElementById('thumbs');

const PETAL_COUNT = 28;
const petalImg = new Image();
petalImg.src = './flower.png';

const poemLines = [
  "雨过天青，我只愿为你停驻.",
  "千帆过尽，世间皆可换，独你不可更替.",
  "若此生可许，愿倾尽所有，护你温柔如初.",
  "雨汐，你是我唯一。"
];

function typePoem(target, lines, delay=40){
  target.textContent = '';
  let i=0;
  function nextLine(){
    if(i>=lines.length) return;
    const line = lines[i]; let j=0;
    const t = setInterval(()=>{
      if(j<line.length) target.textContent += line[j++];
      else { clearInterval(t); target.textContent += '\n'; i++; setTimeout(nextLine, 400); }
    }, delay);
  }
  nextLine();
}

function fitCanvas(){
  petalCanvas.width = window.innerWidth;
  petalCanvas.height = window.innerHeight;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const petals = [];
function spawnSingle(x, y){
  petals.push({
    x: x,
    y: y,
    vx: (Math.random()*2-1)*0.4,
    vy: 0.4 + Math.random()*0.6,
    ang: Math.random()*Math.PI*2,
    aVel: (Math.random()*2-1)*0.01,
    size: 20 + Math.random()*38,
    sway: Math.random()*0.6 + 0.2
  });
}

function spawnGentle(count){
  const w = petalCanvas.width;
  for(let i=0;i<count;i++){
    const sx = w*(0.35 + Math.random()*0.3);
    const sy = -20 - Math.random()*120;
    spawnSingle(sx, sy);
  }
}

function updateAndRender(){
  ctx.clearRect(0,0,petalCanvas.width,petalCanvas.height);
  const t = performance.now()/1000;
  for(let i=petals.length-1;i>=0;i--){
    const p = petals[i];
    const wind = Math.sin(t*0.4 + p.x*0.001)*0.18;
    p.vx += wind*0.01;
    p.vy += 0.000 + 0.02;
    p.x += p.vx + Math.sin(t*p.sway)*0.2;
    p.y += p.vy;
    p.ang += p.aVel;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    const s = p.size;
    const scale = 0.85 + Math.abs(Math.sin(t + p.x))*0.25;
    ctx.drawImage(petalImg, -s/2, -s/2, s*scale, s*scale);
    ctx.restore();
    if(p.y > petalCanvas.height + 60) petals.splice(i,1);
  }
  requestAnimationFrame(updateAndRender);
}
requestAnimationFrame(updateAndRender);

startBtn.addEventListener('click', ()=>{
  spawnGentle(PETAL_COUNT);
  setTimeout(()=>enterStage(), 1400);
});
skipBtn.addEventListener('click', enterStage);

function enterStage(){
  intro.classList.add('hidden');
  stage.classList.remove('hidden');
  typePoem(poemEl, poemLines, 45);
  fetch('./music.mp3').then(r=>{ if(r.ok) musicName.value='music.mp3'; }).catch(()=>{});
  fetch('./music.flac').then(r=>{ if(r.ok && !audio.src) musicName.value='music.flac'; }).catch(()=>{});
}

useBgFile.addEventListener('click', ()=>{
  const p = (bgPath.value || '').trim();
  if(!p) return alert('请填写背景文件名（例如 background.jpg）或上传图片');
  document.body.style.background = `url('./${p}') center/cover no-repeat, linear-gradient(135deg,var(--bg-a),var(--bg-b))`;
  showNotice('尝试加载仓库背景：' + p);
});
bgUpload.addEventListener('change', (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const url = URL.createObjectURL(f);
  document.body.style.background = `url('${url}') center/cover no-repeat, linear-gradient(135deg,var(--bg-a),var(--bg-b))`;
  showNotice('已加载本地背景（会话内生效）');
});

loadMusic.addEventListener('click', ()=>{
  let name = (musicName.value || '').trim();
  if(!name){ showNotice('请填写音乐文件名，或先把 music.mp3 放入仓库。'); return; }
  if(/\.[a-z0-9]+$/i.test(name)){
    audio.src = './' + name;
  } else {
    audio.src = './' + name + '.mp3';
    audio.onerror = ()=>{ audio.src = './' + name + '.flac'; };
  }
  showNotice('尝试加载音乐：' + audio.src);
});

togglePlay.addEventListener('click', async ()=>{
  try{
    if(audio.paused) { await audio.play(); togglePlay.textContent='暂停'; }
    else { audio.pause(); togglePlay.textContent='播放/暂停'; }
  }catch(e){ showNotice('播放失败：请先与页面交互或检查音乐文件名'); }
});

let lrcLines = [];
function parseLRC(text){
  const lines = text.split(/\r?\n/);
  const parsed = [];
  const timeRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for(const raw of lines){
    let match;
    timeRe.lastIndex = 0;
    const textPart = raw.replace(timeRe, '').trim();
    while((match = timeRe.exec(raw)) !== null){
      const mm = parseInt(match[1],10);
      const ss = parseInt(match[2],10);
      const ms = match[3] ? parseInt(match[3].padEnd(3,'0'),10) : 0;
      const t = mm*60*1000 + ss*1000 + ms;
      parsed.push({time: t, text: textPart || ''});
    }
  }
  parsed.sort((a,b)=>a.time - b.time);
  return parsed;
}

useLrcPath.addEventListener('click', async ()=>{
  const p = (lrcPath.value || '').trim();
  if(!p) return alert('请填写歌词文件名例如 lyrics.lrc');
  try{
    const res = await fetch('./' + p);
    if(!res.ok) throw new Error('无法加载歌词文件');
    const txt = await res.text();
    lrcLines = parseLRC(txt);
    renderLyrics();
    showNotice('已加载歌词：' + p);
  }catch(e){ showNotice('加载歌词失败：' + e.message); }
});

lrcUpload.addEventListener('change', (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    lrcLines = parseLRC(reader.result);
    renderLyrics();
    showNotice('已上传歌词（会话内生效）');
  };
  reader.readAsText(f, 'utf-8');
});

function renderLyrics(){
  lyricsContainer.innerHTML = '';
  for(const ln of lrcLines){
    const d = document.createElement('div');
    d.className = 'line';
    d.dataset.time = ln.time;
    d.textContent = ln.text;
    lyricsContainer.appendChild(d);
  }
  lyricsContainer.scrollTop = 0;
}

audio.addEventListener('timeupdate', ()=>{
  if(!lrcLines.length) return;
  const cur = audio.currentTime * 1000;
  let idx = -1;
  for(let i=0;i<lrcLines.length;i++){
    if(cur >= lrcLines[i].time) idx = i; else break;
  }
  const nodes = lyricsContainer.querySelectorAll('.line');
  nodes.forEach((n,i)=>{ n.classList.toggle('active', i === idx); });
  if(idx >= 0){
    const el = nodes[idx];
    const container = lyricsContainer;
    const top = el.offsetTop - container.clientHeight/2 + el.clientHeight/2;
    container.scrollTop = top;
  }
});

photoUpload.addEventListener('change', (e)=>{
  const files = Array.from(e.target.files || []);
  for(const f of files){
    const url = URL.createObjectURL(f);
    const div = document.createElement('div'); div.className='thumb';
    const img = document.createElement('img'); img.src = url; div.appendChild(img); thumbs.appendChild(div);
  }
});
addFromRepo.addEventListener('click', ()=>{
  const csv = prompt('在仓库中图片相对路径（逗号分隔），例如 img1.jpg,img2.jpg');
  if(!csv) return;
  const names = csv.split(',').map(s=>s.trim()).filter(Boolean);
  for(const n of names){
    const div = document.createElement('div'); div.className='thumb';
    const img = document.createElement('img'); img.src = './' + n; img.onerror = ()=>{ img.style.opacity=0.4; img.alt='未找到'; };
    div.appendChild(img); thumbs.appendChild(div);
  }
});

function showNotice(msg, tm=3000){ let el = document.getElementById('_notice_'); if(!el){ el = document.createElement('div'); el.id='_notice_'; el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px'; el.style.background='rgba(0,0,0,0.6)'; el.style.color='#fff'; el.style.padding='8px 12px'; el.style.borderRadius='8px'; document.body.appendChild(el); } el.textContent = msg; el.style.display='block'; setTimeout(()=>el.style.display='none', tm); }

fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src = './music.mp3'; musicName.value='music.mp3'; }}).catch(()=>{});
fetch('./music.flac').then(r=>{ if(r.ok && !audio.src){ audio.src = './music.flac'; musicName.value='music.flac'; }}).catch(()=>{});
