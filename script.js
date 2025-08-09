/* script.js - NO petal animation, improved typing, transparent UI, LRC lyrics sync */

// Elements
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const intro = document.getElementById('intro');
const stage = document.getElementById('stage');
const bgWrapper = document.getElementById('bg-wrapper');
const coverFlower = document.getElementById('coverFlower');
const bgPath = document.getElementById('bgPath');
const useBgFile = document.getElementById('useBgFile');
const bgUpload = document.getElementById('bgUpload');
const poemEl = document.getElementById('poem');

// music & lyrics
const audio = document.getElementById('audio');
const musicName = document.getElementById('musicName');
const loadMusic = document.getElementById('loadMusic');
const togglePlay = document.getElementById('togglePlay');
const lyricsContainer = document.getElementById('lyrics');
const lrcPath = document.getElementById('lrcPath');
const useLrcPath = document.getElementById('useLrcPath');
const lrcUpload = document.getElementById('lrcUpload');

// album controls
const photoUpload = document.getElementById('photoUpload');
const addFromRepo = document.getElementById('addFromRepo');
const thumbs = document.getElementById('thumbs');

// Poem lines (improved, unique theme)
const poemLines = [
  "昨夜雨声微，梦回江南旧径。",
  "灯火零落处，执手共看潮生月影。",
  "浮世几回，唯汝一笑，足以安我余生。",
  "雨汐，彼此一诺，生死不渝。"
];

// Better typing: reveal line-by-line with fade
async function showPoemLines(target, lines, perCharDelay=28){
  target.innerHTML = '';
  for(const line of lines){
    const span = document.createElement('div');
    span.className = 'poem-line';
    target.appendChild(span);
    // type letters
    for(let i=0;i<line.length;i++){
      span.textContent += line[i];
      await new Promise(res=>setTimeout(res, perCharDelay));
    }
    // small pause, then fade-in effect (we'll use CSS transitions)
    span.style.opacity = 0;
    // force reflow then set opacity to 1 to animate
    span.getBoundingClientRect();
    span.style.transition = 'opacity 420ms ease, transform 420ms ease';
    span.style.opacity = 1;
    span.style.transform = 'translateY(0)';
    await new Promise(res=>setTimeout(res, 420 + 320));
  }
}

// enter stage
startBtn.addEventListener('click', ()=>{ enterStage(); });
skipBtn.addEventListener('click', enterStage);

function enterStage(){
  intro.classList.add('hidden');
  stage.classList.remove('hidden');
  // start poem typing (line-by-line)
  showPoemLines(poemEl, poemLines, 28);
  // auto detect music file if present
  fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src='./music.mp3'; musicName.value='music.mp3'; }}).catch(()=>{});
  fetch('./music.flac').then(r=>{ if(r.ok && !audio.src){ audio.src='./music.flac'; musicName.value='music.flac'; }}).catch(()=>{});
}

// background: use repo path or upload session
useBgFile.addEventListener('click', ()=>{
  const p = (bgPath.value||'').trim();
  if(!p) return alert('请填写背景文件名（例如 background.jpg）或上传图片');
  bgWrapper.style.backgroundImage = `url('./${p}')`;
  bgWrapper.style.backgroundSize = 'cover';
  bgWrapper.style.backgroundPosition = 'center';
  showNotice('尝试加载仓库背景：' + p);
});
bgUpload.addEventListener('change', (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const url = URL.createObjectURL(f);
  bgWrapper.style.backgroundImage = `url('${url}')`;
  bgWrapper.style.backgroundSize = 'cover';
  bgWrapper.style.backgroundPosition = 'center';
  showNotice('已加载本地背景（会话内生效）');
});

// music loading
loadMusic.addEventListener('click', ()=>{
  let name = (musicName.value||'').trim();
  if(!name){ showNotice('请填写音乐文件名，或先把 music.mp3 放入仓库。'); return; }
  if(/\.[a-z0-9]+$/i.test(name)) audio.src = './' + name;
  else { audio.src = './' + name + '.mp3'; audio.onerror = ()=>{ audio.src = './' + name + '.flac'; }; }
  showNotice('尝试加载音乐：' + audio.src);
});

togglePlay.addEventListener('click', async ()=>{
  try{
    if(audio.paused){ await audio.play(); togglePlay.textContent='暂停'; }
    else { audio.pause(); togglePlay.textContent='播放/暂停'; }
  }catch(e){ showNotice('播放失败：请先与页面交互或检查音乐文件名'); }
});

// lyrics parsing (LRC)
let lrcLines = [];
function parseLRC(text){
  const lines = text.split(/\r?\n/);
  const parsed = [];
  const timeRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for(const raw of lines){
    timeRe.lastIndex = 0;
    const textPart = raw.replace(timeRe, '').trim();
    let match;
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
  const p = (lrcPath.value||'').trim();
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
  reader.onload = ()=>{ lrcLines = parseLRC(reader.result); renderLyrics(); showNotice('已上传歌词（会话内生效）'); };
  reader.readAsText(f, 'utf-8');
});

function renderLyrics(){
  lyricsContainer.innerHTML = '';
  for(const ln of lrcLines){
    const d = document.createElement('div'); d.className='line'; d.dataset.time = ln.time; d.textContent = ln.text; lyricsContainer.appendChild(d);
  }
  lyricsContainer.scrollTop = 0;
}

audio.addEventListener('timeupdate', ()=>{
  if(!lrcLines.length) return;
  const cur = audio.currentTime * 1000;
  let idx = -1;
  for(let i=0;i<lrcLines.length;i++){ if(cur >= lrcLines[i].time) idx = i; else break; }
  const nodes = lyricsContainer.querySelectorAll('.line');
  nodes.forEach((n,i)=> n.classList.toggle('active', i === idx));
  if(idx >= 0){
    const el = nodes[idx];
    const container = lyricsContainer;
    const top = el.offsetTop - container.clientHeight/2 + el.clientHeight/2;
    container.scrollTop = top;
  }
});

photoUpload.addEventListener('change', (e)=>{
  const files = Array.from(e.target.files||[]);
  for(const f of files){
    const url = URL.createObjectURL(f); const div = document.createElement('div'); div.className='thumb'; const img = document.createElement('img'); img.src = url; div.appendChild(img); thumbs.appendChild(div);
  }
});
addFromRepo.addEventListener('click', ()=>{
  const csv = prompt('在仓库中图片相对路径（逗号分隔），例如 img1.jpg,img2.jpg'); if(!csv) return;
  const names = csv.split(',').map(s=>s.trim()).filter(Boolean);
  for(const n of names){ const div = document.createElement('div'); div.className='thumb'; const img = document.createElement('img'); img.src = './'+n; img.onerror = ()=>{ img.style.opacity=0.4; img.alt='未找到'; }; div.appendChild(img); thumbs.appendChild(div); }
});

function showNotice(msg, tm=3000){ let el = document.getElementById('_notice_'); if(!el){ el = document.createElement('div'); el.id='_notice_'; el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px'; el.style.background='rgba(0,0,0,0.6)'; el.style.color='#fff'; el.style.padding='8px 12px'; el.style.borderRadius='8px'; document.body.appendChild(el); } el.textContent = msg; el.style.display='block'; setTimeout(()=>el.style.display='none', tm); }

// default music detection
fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src = './music.mp3'; musicName.value='music.mp3'; }}).catch(()=>{});
fetch('./music.flac').then(r=>{ if(r.ok && !audio.src){ audio.src = './music.flac'; musicName.value='music.flac'; }}).catch(()=>{});
