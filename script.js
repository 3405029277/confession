// script.js - permanent package: poem typing into .poem-panel and robust lyric sync
document.addEventListener('DOMContentLoaded', ()=>{
  const playBtn = document.getElementById('playBtn');
  const audio = document.getElementById('audio');
  const lyricsBox = document.getElementById('lyricsBox');
  const lyricsEl = document.getElementById('lyrics');
  let poemEl = document.getElementById('poem');

  // If poem element missing, create one inside .poem-panel
  if(!poemEl){
    const panel = document.querySelector('.poem-panel') || document.body;
    const newPoem = document.createElement('div');
    newPoem.id = 'poem';
    newPoem.className = 'poem';
    panel.prepend(newPoem);
    poemEl = newPoem;
  }

  const poemLines = [
    "月溶寒窗，风拂轻裙，夜色里我思君深。",
    "一盏孤灯，千行旧字，字字皆为君留痕。",
    "花落无声，情到深处犹自温存，",
    "朝朝暮暮，海誓山盟只为君存。",
    "若问浮生何所依，便是你一笑在眉间。",
    "若问此心何所向，唯有雨汐，不负此生言。",
    "此情千回，不改初心；此生一诺，与你为连。",
    "雨汐——愿以余生，换你片刻温暖；你是我，唯一无二。"
  ];

  // typing function: inject into #poem (reserved lines, per-char typing, reveal per line)
  async function typePoemFixed(lines, perChar=22){
    if(!poemEl) return;
    poemEl.innerHTML = '';
    const lineEls = [];
    for(let i=0;i<lines.length;i++){
      const lineDiv = document.createElement('div');
      lineDiv.className = 'poem-line';
      const inner = document.createElement('span');
      inner.className = 'poem-inner';
      lineDiv.appendChild(inner);
      poemEl.appendChild(lineDiv);
      lineEls.push({lineDiv, inner});
    }
    for(let i=0;i<lines.length;i++){
      const text = lines[i];
      const {lineDiv, inner} = lineEls[i];
      inner.textContent = '';
      for(let c=0;c<text.length;c++){
        const ch = document.createElement('span');
        ch.className = 'char';
        ch.textContent = text[c];
        inner.appendChild(ch);
        await new Promise(r=>setTimeout(r, perChar));
      }
      lineDiv.classList.add('visible');
      await new Promise(r=>setTimeout(r, 360));
    }
  }

  // expose for console debugging
  window.typePoemFixed = typePoemFixed;

  // music detection
  function detectMusic(){
    fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src='./music.mp3'; } else { fetch('./music.flac').then(r2=>{ if(r2.ok) audio.src='./music.flac'; }); } }).catch(()=>{});
  }

  // parse LRC
  function parseLRC(text){
    const lines = text.split(/\r?\n/);
    const res = [];
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
        res.push({time: t, text: textPart});
      }
    }
    res.sort((a,b)=>a.time - b.time);
    return res;
  }

  let lrcLines = [];
  function renderLyrics(lines){
    lyricsEl.innerHTML = '';
    lines.forEach(ln=>{
      const d = document.createElement('div');
      d.className = 'line';
      d.dataset.time = ln.time;
      d.textContent = ln.text;
      lyricsEl.appendChild(d);
    });
    lyricsBox.scrollTop = 0;
  }

  async function loadLyrics(){
    try{
      const r = await fetch('./lyrics.lrc');
      if(!r.ok) return;
      const txt = await r.text();
      lrcLines = parseLRC(txt);
      renderLyrics(lrcLines);
    }catch(e){ console.warn('no lyrics file'); }
  }

  function centerElementInContainer(el, container){
    if(!el || !container) return;
    const top = el.offsetTop - container.clientHeight/2 + el.clientHeight/2;
    try{ container.scrollTo({ top: top, behavior: 'smooth' }); } catch(e){ container.scrollTop = top; }
  }

  function findIndexByTime(ms){
    if(!lrcLines || !lrcLines.length) return -1;
    let lo = 0, hi = lrcLines.length - 1, ans = -1;
    while(lo <= hi){
      const mid = Math.floor((lo + hi) / 2);
      if(ms >= lrcLines[mid].time){ ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }

  // user scroll pause to prevent fighting user's manual scroll
  let userInteracted = false, userTimeout = null;
  function attachUserPause(){
    if(!lyricsBox) return;
    lyricsBox.addEventListener('wheel', ()=>{ userInteracted = true; clearTimeout(userTimeout); userTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
    lyricsBox.addEventListener('touchstart', ()=>{ userInteracted = true; clearTimeout(userTimeout); userTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
    lyricsBox.addEventListener('scroll', ()=>{ userInteracted = true; clearTimeout(userTimeout); userTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
  }
  attachUserPause();

  // lyrics sync
  let lastIndex = -1;
  audio.addEventListener('timeupdate', ()=>{
    if(!lrcLines || !lrcLines.length) return;
    if(audio.paused) return;
    const cur = Math.floor(audio.currentTime * 1000);
    const idx = findIndexByTime(cur);
    if(idx === -1) return;
    if(idx !== lastIndex){
      lastIndex = idx;
      const nodes = lyricsEl.querySelectorAll('.line');
      nodes.forEach((n,i)=> n.classList.toggle('active', i === idx));
      if(!userInteracted && nodes[idx]){
        centerElementInContainer(nodes[idx], lyricsBox);
      }
    }
  });

  audio.addEventListener('play', ()=>{ lastIndex = -1; });

  playBtn.addEventListener('click', async ()=>{
    try{
      if(audio.paused){ await audio.play(); playBtn.textContent='暂停'; } else { audio.pause(); playBtn.textContent='播放/暂停'; }
    }catch(e){ alert('播放失败：请先交互或确认 music.mp3 已上传'); }
  });

  // init
  detectMusic();
  loadLyrics();
  // start poem typing after small delay so layout settles
  setTimeout(()=>{ typePoemFixed(poemLines, 22); }, 260);
});