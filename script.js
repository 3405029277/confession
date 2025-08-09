// script.js - love page logic: rainbow poem typing and lyrics sync (centered)
document.addEventListener('DOMContentLoaded', ()=>{
  const playBtn = document.getElementById('playBtn');
  const audio = document.getElementById('audio');
  const lyricsBox = document.getElementById('lyricsBox');
  const lyricsEl = document.getElementById('lyrics');
  const poemEl = document.getElementById('poem');
  const bg = document.getElementById('bg');

  // Poem - Li Shangyin style, emphasize "唯一"
  const poemLines = [
    "月色浸帘，心事寄流水。",
    "千帆过尽，世间皆可更替。",
    "唯汝一笑，足安我一生。",
    "雨汐，汝是我唯一。"
  ];

  // typing: line-by-line with reserved layout (chars appear in spans)
  async function typePoemFixed(lines, perChar=26){
    if(!poemEl) return;
    poemEl.innerHTML = '';
    // pre-create line containers to reserve space
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
    // type into each inner span
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
      // reveal line
      lineDiv.classList.add('visible');
      await new Promise(r=>setTimeout(r, 320));
    }
  }

  // Load music automatically if exists
  function detectMusic(){
    fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src='./music.mp3'; } else { fetch('./music.flac').then(r2=>{ if(r2.ok) audio.src='./music.flac'; }); } }).catch(()=>{});
  }

  // Parse LRC and render
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

  // user pause on manual scroll
  let userInteracted = false, userTimeout = null;
  function attachUserPause(){
    if(!lyricsBox) return;
    lyricsBox.addEventListener('wheel', ()=>{ userInteracted = true; clearTimeout(userTimeout); userTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
    lyricsBox.addEventListener('touchstart', ()=>{ userInteracted = true; clearTimeout(userTimeout); userTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
    lyricsBox.addEventListener('scroll', ()=>{ userInteracted = true; clearTimeout(userTimeout); userTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
  }
  attachUserPause();

  // sync
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
  typePoemFixed(poemLines, 26);
});