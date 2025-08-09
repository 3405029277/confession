// Auto-load version: expects background.jpg, music.mp3 (or music.flac), lyrics.lrc in repo root.
// Elements
const enterBtn = document.getElementById('enterBtn');
const intro = document.getElementById('intro');
const stage = document.getElementById('stage');
const poemEl = document.getElementById('poem');
const audio = document.getElementById('audio');
const togglePlay = document.getElementById('togglePlay');
const lyricsContainer = document.getElementById('lyrics');
const bgWrapper = document.getElementById('bg-wrapper');
const thumbs = document.getElementById('thumbs');

// poem (classical flavor)
const poemLines = [
  "昨夜雨声微，梦回江南旧径。",
  "灯火零落处，执手共看潮生月影。",
  "浮世几回，唯汝一笑，足以安我余生。",
  "雨汐，彼此一诺，生死不渝。"
];

// typing: reveal line-by-line
async function showPoemLines(target, lines, perChar=28){
  target.innerHTML='';
  for(const line of lines){
    const d = document.createElement('div');
    d.className='poem-line';
    target.appendChild(d);
    for(let i=0;i<line.length;i++){ d.textContent += line[i]; await new Promise(r=>setTimeout(r, perChar)); }
    d.style.opacity=0; d.getBoundingClientRect();
    d.style.transition='opacity 420ms ease, transform 420ms ease'; d.style.opacity=1; d.style.transform='translateY(0)';
    await new Promise(r=>setTimeout(r, 420+320));
  }
}

// enter
enterBtn.addEventListener('click', ()=>{ enterStage(); });
function enterStage(){
  intro.classList.add('hidden');
  stage.classList.remove('hidden');
  showPoemLines(poemEl, poemLines, 28);
  detectAndLoadMusic();
  loadLyricsIfExists();
  loadRepoThumbs();
}

// auto-detect music
function detectAndLoadMusic(){
  fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src='./music.mp3'; } else { fetch('./music.flac').then(r2=>{ if(r2.ok) audio.src='./music.flac'; }); } }).catch(()=>{});
}

// auto-load lyrics.lrc if present
async function loadLyricsIfExists(){
  try{
    const r = await fetch('./lyrics.lrc');
    if(!r.ok) return;
    const txt = await r.text();
    lrcLines = parseLRC(txt);
    renderLyrics();
  }catch(e){ /* ignore */ }
}

// parse lrc
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

function renderLyrics(){
  lyricsContainer.innerHTML='';
  for(const ln of lrcLines){
    const d = document.createElement('div'); d.className='line'; d.dataset.time = ln.time; d.textContent = ln.text; lyricsContainer.appendChild(d);
  }
}

// sync lyrics
audio.addEventListener('timeupdate', ()=>{
  if(!lrcLines.length) return;
  const cur = audio.currentTime * 1000;
  let idx = -1;
  for(let i=0;i<lrcLines.length;i++){ if(cur >= lrcLines[i].time) idx = i; else break; }
  const nodes = lyricsContainer.querySelectorAll('.line');
  nodes.forEach((n,i)=> n.classList.toggle('active', i === idx));
  if(idx >= 0){
    const el = nodes[idx]; const container = lyricsContainer; const top = el.offsetTop - container.clientHeight/2 + el.clientHeight/2; container.scrollTop = top;
  }
});

togglePlay.addEventListener('click', async ()=>{
  try{ if(audio.paused){ await audio.play(); togglePlay.textContent='暂停'; } else { audio.pause(); togglePlay.textContent='播放/暂停'; } } catch(e){ showNotice('播放失败，请先与页面交互或确认 music.mp3 已上传'); }
});

// load thumbs from repo automatically if files named thumb1.jpg..thumb6.jpg exist
function loadRepoThumbs(){
  for(let i=1;i<=6;i++){
    const name = `thumb${i}.jpg`;
    fetch('./'+name).then(r=>{ if(r.ok){ const div = document.createElement('div'); div.className='thumb'; const img = document.createElement('img'); img.src='./'+name; div.appendChild(img); thumbs.appendChild(div); } }).catch(()=>{});
  }
}

// notice helper
function showNotice(msg, tm=3000){ let el = document.getElementById('_notice_'); if(!el){ el=document.createElement('div'); el.id='_notice_'; el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px'; el.style.background='rgba(0,0,0,0.6)'; el.style.color='#fff'; el.style.padding='8px 12px'; el.style.borderRadius='8px'; document.body.appendChild(el); } el.textContent=msg; el.style.display='block'; setTimeout(()=>el.style.display='none', tm); }

// auto-detect set background.jpg already applied via inline style in index.html
// auto-detect music in advance
fetch('./music.mp3').then(r=>{ if(r.ok) audio.src='./music.mp3'; }).catch(()=>{});
fetch('./music.flac').then(r=>{ if(r.ok && !audio.src) audio.src='./music.flac'; }).catch(()=>{});
