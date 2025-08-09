// script.js - two-page behavior: per-char poem typing and lyrics-synced player
document.addEventListener('DOMContentLoaded', ()=>{
  const poemEl = document.getElementById('poem');
  const audio = document.getElementById('audio');
  const playBtn = document.getElementById('playBtn');
  const lyricsBox = document.getElementById('lyricsBox');
  const lyricsEl = document.getElementById('lyrics');

  // Poem lines combined with lyrical sentiment
  const poemLines = [
    "你真的懂“唯一”的定义吗，不只是呼吸，",
    "而是那一声叹息里，我的名字被温柔收藏；",
    "你真的希望厘清，但若无千里共婵娟，",
    "又怎知此心能否抵达你的门前？",
    "我真的爱你，句句不轻易，眼神里藏着海浪的深情，",
    "在颠沛流离中愿与你并肩，哪怕风雨；",
    "若问此生所依，便是你一笑在眉间，",
    "若问此心所向，唯有雨汐，是我唯一光焰。"
  ];

  // prepare poem container (create lines DOM)
  function preparePoem(lines){
    poemEl.innerHTML = '';
    const containers = [];
    for(let i=0;i<lines.length;i++){
      const d = document.createElement('div');
      d.className = 'poem-line';
      poemEl.appendChild(d);
      containers.push(d);
    }
    return containers;
  }

  // Type per character into spans (each span gets gradient via CSS)
  async function typePerChar(lines, perChar = 70){
    const containers = preparePoem(lines);
    for(let i=0;i<lines.length;i++){
      const text = lines[i];
      const container = containers[i];
      for(let c=0;c<text.length;c++){
        const ch = document.createElement('span');
        ch.textContent = text[c];
        ch.style.opacity = '0';
        ch.style.transform = 'translateY(8px)';
        ch.style.transition = 'opacity .18s ease, transform .18s ease';
        container.appendChild(ch);
        // micro delay before reveal
        await new Promise(r=>setTimeout(r, 12));
        requestAnimationFrame(()=>{ ch.style.opacity = '1'; ch.style.transform = 'translateY(0)'; });
        await new Promise(r=>setTimeout(r, perChar));
      }
      container.classList.add('visible');
      await new Promise(r=>setTimeout(r, 300));
    }
  }

  // detect music file
  function detectMusic(){
    fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src = './music.mp3'; } else { fetch('./music.flac').then(r2=>{ if(r2.ok) audio.src='./music.flac'; }); } }).catch(()=>{});
  }

  // parse LRC times
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

  function findIndexByTime(ms){
    if(!lrcLines || !lrcLines.length) return -1;
    let lo = 0, hi = lrcLines.length - 1, ans = -1;
    while(lo <= hi){
      const mid = Math.floor((lo + hi) / 2);
      if(ms >= lrcLines[mid].time){ ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }

  function centerElement(el, container){
    if(!el || !container) return;
    const top = el.offsetTop - container.clientHeight/2 + el.clientHeight/2;
    try{ container.scrollTo({top, behavior:'smooth'}); container.scrollTop = top; } catch(e){ container.scrollTop = top; }
  }

  let lastIndex = -1;
  let userInteracted = false, userTimeout = null;
  function attachUserPause(){
    if(!lyricsBox) return;
    lyricsBox.addEventListener('wheel', ()=>{ userInteracted=true; clearTimeout(userTimeout); userTimeout=setTimeout(()=>userInteracted=false,6000); }, {passive:true});
    lyricsBox.addEventListener('touchstart', ()=>{ userInteracted=true; clearTimeout(userTimeout); userTimeout=setTimeout(()=>userInteracted=false,6000); }, {passive:true});
    lyricsBox.addEventListener('scroll', ()=>{ userInteracted=true; clearTimeout(userTimeout); userTimeout=setTimeout(()=>userInteracted=false,6000); }, {passive:true});
  }
  attachUserPause();

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
      if(!userInteracted && nodes[idx]) centerElement(nodes[idx], lyricsBox);
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
  setTimeout(()=>{ typePerChar(poemLines, 70); }, 480);
});