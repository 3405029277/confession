// script.js - enter button, transparent UI, robust lyrics sync

document.addEventListener('DOMContentLoaded', ()=>{
  const enterBtn = document.getElementById('enterBtn');
  const intro = document.getElementById('intro');
  const stage = document.getElementById('stage');
  const poemEl = document.getElementById('poem');
  const audio = document.getElementById('audio');
  const togglePlay = document.getElementById('togglePlay');
  const lyricsContainer = document.getElementById('lyrics');
  const thumbs = document.getElementById('thumbs');
  const bg = document.getElementById('bg-wrapper');

  // Set bg wrapper image explicitly to ensure it loads
  bg.style.backgroundImage = "url('./background.jpg')";

  // Poem (more romantic, classical)
  const poemLines = [
    "昨夜雨声微，梦回江南旧径。",
    "灯火零落处，执手共看潮生月影。",
    "浮世几回，唯汝一笑，足以安我余生。",
    "雨汐，汝是我唯一。"
  ];

  // typing effect - line by line
  async function showPoemLines(lines, perChar=28){
    poemEl.innerHTML = '';
    for(const line of lines){
      const div = document.createElement('div');
      div.className = 'poem-line';
      poemEl.appendChild(div);
      for(let i=0;i<line.length;i++){
        div.textContent += line[i];
        await new Promise(r=>setTimeout(r, perChar));
      }
      // fade in effect
      div.style.opacity = 0;
      div.getBoundingClientRect();
      div.style.transition = 'opacity 420ms ease, transform 420ms ease';
      div.style.opacity = 1;
      div.style.transform = 'translateY(0)';
      await new Promise(r=>setTimeout(r, 420+300));
    }
  }

  // Enter button behavior
  enterBtn.addEventListener('click', ()=>{
    intro.classList.add('hidden');
    stage.classList.remove('hidden');
    // show poem
    showPoemLines(poemLines, 28);
    // auto-load music and lyrics (do not autoplay)
    detectMusic();
    loadLyricsIfExists();
    loadThumbsIfExists();
    // ensure lyrics start at top
    if(lyricsContainer) lyricsContainer.scrollTop = 0;
  });

  // music detection (mp3 then flac)
  function detectMusic(){
    fetch('./music.mp3').then(r=>{ if(r.ok){ audio.src = './music.mp3'; } else { fetch('./music.flac').then(r2=>{ if(r2.ok) audio.src = './music.flac'; }); } }).catch(()=>{});
  }

  togglePlay.addEventListener('click', async ()=>{
    try{
      if(audio.paused){ await audio.play(); togglePlay.textContent='暂停'; } else { audio.pause(); togglePlay.textContent='播放/暂停'; }
    }catch(e){ alert('播放失败：请先与页面交互或确认音乐存在。'); }
  });

  // lyrics parsing
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

  // load lyrics if lyrics.lrc exists
  async function loadLyricsIfExists(){
    try{
      const r = await fetch('./lyrics.lrc');
      if(!r.ok) return;
      const txt = await r.text();
      lrcLines = parseLRC(txt);
      renderLyrics();
      // reset state
      lastLyricIndex = -1;
      if(lyricsContainer) lyricsContainer.scrollTop = 0;
    }catch(e){ console.warn('no lyrics'); }
  }

  // render lyrics lines
  function renderLyrics(){
    if(!lyricsContainer) return;
    lyricsContainer.innerHTML = '';
    for(const ln of lrcLines){
      const d = document.createElement('div');
      d.className = 'line';
      d.dataset.time = ln.time;
      d.textContent = ln.text;
      lyricsContainer.appendChild(d);
    }
  }

  // thumbs auto-load thumb1..thumb6
  function loadThumbsIfExists(){
    for(let i=1;i<=6;i++){
      const name = `thumb${i}.jpg`;
      fetch('./'+name).then(r=>{ if(r.ok){ const div=document.createElement('div'); div.className='thumb'; const img=document.createElement('img'); img.src='./'+name; div.appendChild(img); thumbs.appendChild(div); } }).catch(()=>{});
    }
  }

  // lyrics sync: binary search and center, with user-interaction pause
  let lastLyricIndex = -1;
  let userInteracted = false;
  let userScrollTimeout = null;

  function findLyricIndex(ms){
    if(!lrcLines || !lrcLines.length) return -1;
    let lo = 0, hi = lrcLines.length - 1, ans = -1;
    while(lo <= hi){
      const mid = Math.floor((lo + hi) / 2);
      if(ms >= lrcLines[mid].time){ ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }

  function attachUserScrollPause(container){
    if(!container) return;
    container.addEventListener('wheel', ()=>{ userInteracted = true; clearTimeout(userScrollTimeout); userScrollTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
    container.addEventListener('touchstart', ()=>{ userInteracted = true; clearTimeout(userScrollTimeout); userScrollTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
    container.addEventListener('scroll', ()=>{ userInteracted = true; clearTimeout(userScrollTimeout); userScrollTimeout = setTimeout(()=>userInteracted=false, 6000); }, {passive:true});
  }
  attachUserScrollPause(lyricsContainer);

  // reset index on play to avoid jumping to last
  audio.addEventListener('play', ()=>{ lastLyricIndex = -1; });

  audio.addEventListener('timeupdate', ()=>{
    if(!lrcLines || !lrcLines.length) return;
    if(audio.paused) return; // only sync while playing
    const cur = Math.floor(audio.currentTime * 1000);
    const idx = findLyricIndex(cur);
    if(idx === -1) return;
    if(idx !== lastLyricIndex){
      lastLyricIndex = idx;
      const nodes = lyricsContainer ? lyricsContainer.querySelectorAll('.line') : [];
      nodes.forEach((n,i)=> n.classList.toggle('active', i === idx));
      if(!userInteracted && nodes[idx]){
        const el = nodes[idx];
        const container = lyricsContainer;
        const top = el.offsetTop - container.clientHeight/2 + el.clientHeight/2;
        try{ container.scrollTo({ top: top, behavior: 'smooth' }); } catch(e){ container.scrollTop = top; }
      }
    }
  });

  // expose functions for debugging in console
  window._confession_debug = { loadLyricsIfExists, renderLyrics, findLyricIndex };
});
