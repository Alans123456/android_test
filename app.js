(function(){
"use strict";
var banks = {
  android: { name:"Android", tag:"CET343 · Android MCQs", questions:window.ANDROID_QUESTIONS || [] },
  ai: { name:"AI", tag:"Artificial Intelligence MCQs", questions:window.AI_QUESTIONS || [] }
};
var bankId = "android";
var Q = banks[bankId].questions;
var L = ["A","B","C","D"];
var KEY = "cet343-drill-v2";
var $ = function(id){ return document.getElementById(id); };

/* ---------------- keep text dragging from jamming the frame ---------------- */
/* A native drag started on selected text inside a sandboxed frame can leave the
   page in a drag state that swallows every following click. Selecting text still
   works; only the drag-and-drop gesture is cancelled. */
["dragstart","dragover","drop"].forEach(function(ev){
  document.addEventListener(ev, function(e){ e.preventDefault(); }, { capture:true });
});

/* ---------------- sound ---------------- */
var sfxOn = true, actx = null;
try{ var sv = localStorage.getItem(KEY+"-sfx"); if(sv === "0") sfxOn = false; }catch(e){}
var audioDead = false;
function ac(){
  /* Some mobile browsers (in-app webviews especially) refuse to create an
     AudioContext at all. Sound is optional, so a failure here must never stop
     the page from working. */
  if(audioDead) return null;
  try{
    if(!actx){
      var C = window.AudioContext || window.webkitAudioContext;
      if(!C){ audioDead = true; return null; }
      actx = new C();
    }
    if(actx.state === "suspended") actx.resume();
    return actx;
  }catch(e){
    audioDead = true;
    return null;
  }
}
function tone(freq, at, dur, type, vol){
  var c = ac(); if(!c) return;
  try{
  var o = c.createOscillator(), g = c.createGain();
  o.type = type || "sine"; o.frequency.value = freq;
  var t = c.currentTime + at;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol == null ? .16 : vol, t + .012);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + .02);
  }catch(e){ audioDead = true; }
}
var SFX = {
  tap:  function(){ tone(520, 0, .06, "triangle", .05); },
  right:function(){ tone(659.3,0,.12,"sine",.13); tone(880,.075,.15,"sine",.12); tone(1174.7,.15,.26,"sine",.1); },
  wrong:function(){ tone(196,0,.16,"sawtooth",.07); tone(146.8,.06,.3,"sawtooth",.06); },
  done: function(){ [523.3,659.3,784,1046.5].forEach(function(f,i){ tone(f, i*.09, .38, "sine", .12); }); },
  fail: function(){ [392,330,262].forEach(function(f,i){ tone(f, i*.13, .34, "triangle", .1); }); }
};
function play(n){ if(sfxOn && SFX[n]) try{ SFX[n](); }catch(e){} }
function paintSound(){
  $("sound").innerHTML = sfxOn
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7"/><path d="M19 5.5a8.5 8.5 0 0 1 0 13"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/></svg>';
  $("sound").setAttribute("aria-pressed", sfxOn ? "true" : "false");
}
paintSound();
$("sound").addEventListener("click", function(){
  sfxOn = !sfxOn; paintSound();
  try{ localStorage.setItem(KEY+"-sfx", sfxOn ? "1" : "0"); }catch(e){}
  if(sfxOn) play("tap");
});

/* ---------------- theme ---------------- */
$("theme").addEventListener("click", function(){
  var r = document.documentElement, now = r.getAttribute("data-theme");
  if(!now) now = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  r.setAttribute("data-theme", now === "dark" ? "light" : "dark");
  play("tap");
});

/* ---------------- saved progress ----------------
   Your XP, past rounds and weak questions live in this browser's
   localStorage. Nothing is uploaded anywhere and no server is involved, so
   the progress is per browser. Clearing site data resets it.
------------------------------------------------------------------------- */
var store = { runs: [], stats: {}, xp: 0 };
function loadLocal(){
  try{
    var raw = localStorage.getItem(KEY);
    if(raw){
      var p = JSON.parse(raw);
      if(p && p.stats) store = { runs:p.runs||[], stats:p.stats||{}, xp:p.xp||0 };
    }
  }catch(e){}   /* private browsing can refuse storage; the app still runs */
}
function persist(){
  try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){}
}
loadLocal();

/* ---------------- home ---------------- */
var cfg = { mode:"practice", len:20, hearts:false, timer:false, weak:false, shuf:true, mix:true };

function weakOnes(){
  var out = [];
  for(var k in store.stats){
    var s = store.stats[k];
    if(k.indexOf(bankId + ":") !== 0) continue;
    if(s.wrong > 0) out.push({ n:parseInt(k.slice(bankId.length + 1),10), rate:s.wrong/Math.max(1,s.seen), wrong:s.wrong });
  }
  out.sort(function(a,b){ return (b.rate-a.rate) || (b.wrong-a.wrong); });
  return out;
}
function paintHome(){
  var w = weakOnes(), runs = store.runs || [];
  $("weaknote").textContent = w.length
    ? w.length + " question" + (w.length===1?"":"s") + " you have got wrong before"
    : "Nothing missed yet";
  var best = 0, avg = 0;
  runs.forEach(function(r){ var p = Math.round(r.score/r.total*100); best = Math.max(best,p); avg += p; });
  avg = runs.length ? Math.round(avg/runs.length) : 0;
  $("statrow").innerHTML =
    tileHome("gold", '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>' + (store.xp||0), "Total XP") +
    tileHome("green", best + "%", "Best score") +
    tileHome("blue", avg + "%", "Average") +
    tileHome("redt", w.length, "Weak spots") +
    tileHome("", runs.length, "Rounds done");
}
function tileHome(cls, val, lab){
  return '<div class="stat '+cls+'"><div class="n">'+val+'</div><div class="l">'+lab+'</div></div>';
}
function statKey(n){ return bankId + ":" + n; }
function selectBank(id){
  bankId = id;
  Q = banks[bankId].questions;
  $("title").textContent = banks[bankId].name + " Drill";
  $("banktag").textContent = banks[bankId].tag;
  $("all-len").textContent = "All " + Q.length;
  $("fineprint").innerHTML = bankId === "android"
    ? 'Questions come straight from <b>CET343_Android_Mobile_Development_Model Question.pdf</b>. Questions 77 to 81 are marked against how Android actually works, because the paper\'s own answer key is wrong for those five. Each of them tells you so when you get there.'
    : 'Questions come from the Artificial Intelligence MCQ question bank. Every question has four options and an explanation after marking.';
  if(cfg.len > Q.length) cfg.len = Q.length;
  press(subjectBtns, function(x){ return x.dataset.bank === bankId; });
  press(lenBtns, function(x){ return parseInt(x.dataset.len,10) === cfg.len; });
  meta();
  paintHome();
}
paintHome();

function press(list, hit){ list.forEach(function(b){ b.setAttribute("aria-pressed", hit(b)?"true":"false"); }); }
var subjectBtns = [].slice.call(document.querySelectorAll("#subjects .pick"));
subjectBtns.forEach(function(b){ b.addEventListener("click", function(){
  selectBank(b.dataset.bank); play("tap");
});});
var modeBtns = [].slice.call(document.querySelectorAll("#modes .pick"));
modeBtns.forEach(function(b){ b.addEventListener("click", function(){
  cfg.mode = b.dataset.mode; press(modeBtns, function(x){ return x===b; }); play("tap"); meta();
});});
var lenBtns = [].slice.call(document.querySelectorAll("#lens .chip"));
lenBtns.forEach(function(b){ b.addEventListener("click", function(){
  cfg.len = parseInt(b.dataset.len,10); press(lenBtns, function(x){ return x===b; }); play("tap"); meta();
});});
[["o-hearts","hearts"],["o-timer","timer"],["o-weak","weak"],["o-shuf","shuf"],["o-order","mix"]].forEach(function(p){
  $(p[0]).addEventListener("change", function(e){ cfg[p[1]] = e.target.checked; play("tap"); meta(); });
});
function meta(){
  var count = Math.min(cfg.len, Q.length);
  var s = count + (count >= Q.length ? " questions, the whole bank" : " questions");
  if(count >= Q.length) s += cfg.mix ? ", mixed up" : ", in paper order";
  if(cfg.timer) s += " in " + count + " min";
  if(cfg.hearts) s += ", 5 hearts";
  $("gometa").textContent = s;
}
meta();

/* ---------------- views ---------------- */
function view(v){
  ["home","lesson","done"].forEach(function(k){ $("v-"+k).classList.toggle("hidden", k!==v); });
  window.scrollTo(0,0);
}

/* ---------------- run state ---------------- */
var run = null;
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

function build(pool, len){
  var picked;
  if(cfg.weak){
    var wn = weakOnes().map(function(w){ return w.n; });
    var first = wn.map(function(n){ return pool.filter(function(q){ return q.n===n; })[0]; }).filter(Boolean);
    var rest = shuffle(pool.filter(function(q){ return wn.indexOf(q.n)===-1; }));
    picked = shuffle(first.concat(rest).slice(0, len));
  }else{
    picked = shuffle(pool.slice()).slice(0, len);
  }
  if(len >= 90 && !cfg.mix) picked.sort(function(a,b){ return a.n-b.n; });
  return picked.map(function(q){
    var order = [0,1,2,3];
    if(cfg.shuf) shuffle(order);
    return { q:q, order:order, pick:null, sel:null, graded:false };
  });
}

function start(pool, len){
  if(!pool || !pool.length){
    alert("The question bank did not load. Please reload the page.");
    return;
  }
  run = { items:build(pool, len), i:0, t0:Date.now(), limit: cfg.timer ? len*60000 : 0,
          hearts: cfg.hearts ? 5 : -1, streak:0, bestStreak:0, xp:0, over:false };
  view("lesson");
  $("hearts").classList.toggle("hidden", !cfg.hearts);
  $("clock").classList.toggle("hidden", !cfg.timer);
  $("heartn").textContent = "5";
  $("streak").classList.add("hidden");
  $("streakn").textContent = "0";
  clock();
  render();
}
$("go").addEventListener("click", function(){ play("tap"); start(Q, Math.min(cfg.len, Q.length)); });
$("quit").addEventListener("click", function(){ stopClock(); play("tap"); view("home"); });

/* ---------------- clock ---------------- */
var ct = null;
function stopClock(){ clearInterval(ct); ct = null; }
function clock(){
  stopClock();
  if(!run.limit){ return; }
  function tick(){
    var left = run.limit - (Date.now() - run.t0);
    if(left <= 0){ stopClock(); $("clockn").textContent = "0:00"; finish(true); return; }
    var m = Math.floor(left/60000), s = Math.floor(left%60000/1000);
    $("clockn").textContent = m + ":" + (s<10?"0":"") + s;
    $("clock").style.color = left < 120000 ? "var(--cardinal)" : "var(--wolf)";
  }
  tick(); ct = setInterval(tick, 1000);
}

/* ---------------- render a question ---------------- */
function render(){
  var it = run.items[run.i];
  if(!it){ finish(false); return; }
  var q = it.q;
  if(!it.graded){
    $("fill").style.width = (run.i / run.items.length * 100) + "%";
    $("fill").classList.toggle("empty", run.i === 0);
  }
  $("qref").textContent = "Paper Q" + q.n;
  $("qtopic").textContent = q.t;
  $("qflag").classList.toggle("hidden", !q.disputed);
  $("qtext").textContent = q.q;

  var box = $("choices");
  box.innerHTML = "";
  it.order.forEach(function(orig, slot){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "choice rise";
    b.style.animationDelay = (slot * 45) + "ms";
    b.innerHTML = '<span class="key">'+L[slot]+'</span><span class="txt"></span>';
    b.querySelector(".txt").textContent = q.o[orig];
    b.addEventListener("click", function(){ choose(slot); });
    box.appendChild(b);
  });
  /* The entry animation holds its first frame (opacity 0) via fill-mode. If a
     browser never runs it, drop the class so the options are simply visible. */
  setTimeout(function(){
    [].slice.call(box.children).forEach(function(el){
      el.classList.remove("rise"); el.style.animationDelay = "";
    });
  }, 500);

  var dock = $("dock");
  dock.classList.remove("ok","no");
  $("skip").classList.remove("hidden");
  $("act").textContent = "Check";
  $("act").disabled = true;
  $("act").classList.remove("red");
  $("hint").textContent = "Pick with 1–4, check with Enter";
}

function choose(slot){
  var it = run.items[run.i];
  if(it.graded) return;
  it.sel = slot;
  play("tap");
  var btns = [].slice.call(document.querySelectorAll("#choices .choice"));
  btns.forEach(function(b,i){ b.classList.toggle("sel", i===slot); });
  $("act").disabled = false;
}

/* ---------------- grade ---------------- */
function grade(){
  var it = run.items[run.i], q = it.q;
  if(it.graded || it.sel === null) return;
  it.graded = true;
  it.pick = it.order[it.sel];
  var right = it.pick === q.a;

  var s = store.stats[statKey(q.n)] || { seen:0, wrong:0 };
  s.seen++; if(!right) s.wrong++;
  store.stats[statKey(q.n)] = s;

  if(right){
    run.streak++;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
    run.xp += 10 + (run.streak >= 5 ? 5 : 0);
  }else{
    run.streak = 0;
    if(run.hearts > 0){
      run.hearts--;
      $("heartn").textContent = run.hearts;
      $("hearts").classList.remove("flash"); void $("hearts").offsetWidth; $("hearts").classList.add("flash");
    }
  }
  paintStreak();
  persist();
  $("fill").classList.remove("empty");
  $("fill").style.width = ((run.i + 1) / run.items.length * 100) + "%";

  var btns = [].slice.call(document.querySelectorAll("#choices .choice"));
  btns.forEach(function(b, slot){
    var orig = it.order[slot];
    b.disabled = true;
    b.classList.remove("sel");
    if(cfg.mode === "exam"){ if(orig === it.pick) b.classList.add("sel"); return; }
    if(orig === q.a) b.classList.add("good");
    if(orig === it.pick && !right){ b.classList.add("bad","shake"); }
  });

  if(cfg.mode === "exam"){
    $("act").textContent = run.i === run.items.length-1 ? "Finish" : "Continue";
    $("skip").classList.add("hidden");
    setTimeout(advance, 130);
    return;
  }

  play(right ? "right" : "wrong");
  var dock = $("dock");
  dock.classList.add(right ? "ok" : "no");
  $("vmark").innerHTML = right
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  $("vtitle").textContent = right ? niceWord() : "Not quite";
  if(right){
    $("vsol").classList.add("hidden");
  }else{
    $("vsol").classList.remove("hidden");
    $("vsol").textContent = "Correct answer: " + L[it.order.indexOf(q.a)] + ". " + q.o[q.a];
  }
  $("vwhy").textContent = q.e;
  if(q.disputed){
    $("vnote").classList.remove("hidden");
    $("vnote").innerHTML = "<b>About the paper's answer key</b>";
    $("vnote").appendChild(document.createTextNode(q.disputed));
  }else{
    $("vnote").classList.add("hidden");
  }
  $("skip").classList.add("hidden");
  $("act").textContent = run.i === run.items.length-1 ? "Finish" : "Continue";
  $("act").classList.toggle("red", !right);
  $("hint").textContent = "Enter to carry on";
  $("act").focus({ preventScroll:true });
}

var NICE = ["Nice!","Correct!","Well done!","Got it!","That's right!","Sharp!"];
function niceWord(){
  if(run.streak >= 5) return run.streak + " in a row!";
  return NICE[Math.floor(Math.random()*NICE.length)];
}
function paintStreak(){
  var el = $("streak");
  if(run.streak < 2){ el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  $("streakn").textContent = run.streak;
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}

function advance(){
  if(run.hearts === 0){ finish(false, true); return; }
  if(run.i >= run.items.length-1){ finish(false); return; }
  run.i++;
  render();
  window.scrollTo({ top:0, behavior:"smooth" });
}

$("act").addEventListener("click", function(){
  var it = run.items[run.i];
  if(!it.graded){ grade(); } else { advance(); }
});
$("skip").addEventListener("click", function(){
  var it = run.items[run.i];
  it.graded = true; it.pick = null; it.sel = null;
  run.streak = 0; paintStreak();
  play("tap");
  advance();
});

document.addEventListener("keydown", function(e){
  if($("v-lesson").classList.contains("hidden")) return;
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  var k = e.key.toUpperCase();
  var slot = L.indexOf(k);
  if(slot === -1 && "1234".indexOf(k) !== -1) slot = parseInt(k,10)-1;
  if(slot > -1 && slot < 4){ e.preventDefault(); choose(slot); return; }
  if(e.key === "Enter" || e.key === " "){
    e.preventDefault();
    var it = run.items[run.i];
    if(!it.graded){ grade(); } else { advance(); }
  }
});

/* ---------------- finish ---------------- */
function finish(timedOut, outOfHearts){
  stopClock();
  var answered = run.items.filter(function(it){ return it.graded; });
  var total = (timedOut || outOfHearts) ? Math.max(answered.length,1) : run.items.length;
  var score = run.items.filter(function(it){ return it.pick === it.q.a; }).length;
  var pct = Math.round(score/total*100);
  var mins = Math.max(1, Math.round((Date.now()-run.t0)/60000));

  store.runs = (store.runs||[]).concat([{ at:Date.now(), score:score, total:total, mode:cfg.mode }]);
  if(store.runs.length > 80) store.runs = store.runs.slice(-80);
  store.xp = (store.xp||0) + run.xp;
  persist();
  paintHome();

  $("dtitle").textContent = outOfHearts ? "Out of hearts" : timedOut ? "Time is up" : "Round complete";
  $("dtitle").style.color = (outOfHearts || timedOut) ? "var(--cardinal)" : "var(--bee)";
  $("trophy").classList.toggle("hidden", !!(outOfHearts || timedOut));
  $("dsub").textContent = outOfHearts
    ? "Five mistakes ends the run. Everything you answered is marked below."
    : cfg.timer ? "Finished in about " + mins + " min." : "Here is how it went.";

  rollTo($("dxp"), run.xp, 700);
  $("dscore").textContent = pct + "%";
  $("draw").textContent = score + "/" + total;
  $("dmetal").textContent = run.bestStreak >= 5 ? "Best streak " + run.bestStreak : "Correct";
  if(run.bestStreak >= 5) $("draw").textContent = score + "/" + total;

  var band = pct >= 70 ? ["First class","var(--grass-lt)","var(--grass-tx)"]
           : pct >= 60 ? ["2:1","var(--grass-lt)","var(--grass-tx)"]
           : pct >= 50 ? ["2:2","#fdf0d0","#7a5c00"]
           : pct >= 40 ? ["Third","#fdf0d0","#7a5c00"]
           : ["Under the pass mark","var(--cardinal-lt)","var(--cardinal-tx)"];
  $("dband").textContent = band[0];
  $("dband").style.background = band[1];
  $("dband").style.color = band[2];

  var tops = byTopic();
  $("topics").innerHTML = tops.map(function(t){
    var col = t.pct >= 80 ? "var(--grass)" : t.pct >= 60 ? "var(--macaw)" : t.pct >= 40 ? "var(--bee)" : "var(--cardinal)";
    return '<div class="trow'+(t.pct<60?" weak":"")+'">'
      + '<div class="nm">'+esc(t.name)+'</div>'
      + '<div class="sc">'+t.right+'/'+t.n+'</div>'
      + '<div class="bar"><i style="width:'+Math.max(t.pct,3)+'%;background:'+col+'"></i></div></div>';
  }).join("");

  reviewList("all");
  press([].slice.call(document.querySelectorAll("#tabs .tab")), function(b){ return b.dataset.f === "all"; });
  view("done");
  play(pct >= 60 ? "done" : "fail");
  if(pct >= 60 && !outOfHearts) burst();
}

function rollTo(el, target, ms){
  var t0 = null;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){ el.textContent = target; return; }
  function step(ts){
    if(t0 === null) t0 = ts;
    var p = Math.min(1, (ts-t0)/ms);
    el.textContent = Math.round(target * (1 - Math.pow(1-p, 3)));
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function byTopic(){
  var m = {};
  run.items.forEach(function(it){
    if(!it.graded) return;
    var t = it.q.t;
    if(!m[t]) m[t] = { name:t, n:0, right:0 };
    m[t].n++;
    if(it.pick === it.q.a) m[t].right++;
  });
  return Object.keys(m).map(function(k){
    var o = m[k]; o.pct = Math.round(o.right/o.n*100); return o;
  }).sort(function(a,b){ return a.pct - b.pct || b.n - a.n; });
}

function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ---------------- review: every option shown ---------------- */
function reviewList(f){
  var rows = run.items.filter(function(it){ return it.graded; }).filter(function(it){
    var ok = it.pick === it.q.a;
    if(f === "no") return !ok;
    if(f === "ok") return ok;
    return true;
  });
  $("rlist").innerHTML = rows.map(function(it){
    var q = it.q, ok = it.pick === q.a, skipped = it.pick === null;
    var opts = it.order.map(function(orig, slot){
      var isRight = orig === q.a, isYours = orig === it.pick;
      var cls = isRight ? "good" : (isYours ? "bad" : "");
      var mark = isRight ? (isYours ? "Your answer &middot; correct" : "Correct answer")
                         : (isYours ? "You picked this" : "");
      return '<div class="co '+cls+'">'
        + '<span class="k">'+L[slot]+'</span>'
        + '<span class="t">'+esc(q.o[orig])+'</span>'
        + (mark ? '<span class="m">'+mark+'</span>' : '')
        + '</div>';
    }).join("");
    return '<div class="card '+(ok?"":"no")+'">'
      + '<div class="ctop"><span class="pill">Paper Q'+q.n+'</span><span class="pill">'+esc(q.t)+'</span>'
      + (skipped ? '<span class="pill">Skipped</span>' : '')
      + (q.disputed ? '<span class="pill warn">Key disputed</span>' : '')
      + '</div>'
      + '<div class="cq">'+esc(q.q)+'</div>'
      + '<div class="copts">'+opts+'</div>'
      + '<div class="cwhy">'+esc(q.e)+'</div>'
      + (q.disputed ? '<div class="cnote">'+esc(q.disputed)+'</div>' : '')
      + '</div>';
  }).join("") || '<div class="card"><div class="cq">Nothing in this group.</div></div>';
}
var tabs = [].slice.call(document.querySelectorAll("#tabs .tab"));
tabs.forEach(function(b){ b.addEventListener("click", function(){
  press(tabs, function(x){ return x===b; }); play("tap"); reviewList(b.dataset.f);
});});

$("redo").addEventListener("click", function(){
  var pool = run.items.filter(function(it){ return it.graded && it.pick !== it.q.a; }).map(function(it){ return it.q; });
  play("tap");
  if(!pool.length){ $("dsub").textContent = "Nothing wrong to practise. Try a longer round."; return; }
  var keep = cfg.weak; cfg.weak = false;
  start(pool, pool.length);
  cfg.weak = keep;
});
$("again").addEventListener("click", function(){ play("tap"); start(Q, Math.min(cfg.len, Q.length)); });
$("home").addEventListener("click", function(){ play("tap"); view("home"); });

/* ---------------- confetti ---------------- */
function burst(){
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cv = $("confetti"), ctx = cv.getContext("2d");
  var w = cv.width = window.innerWidth, h = cv.height = window.innerHeight;
  cv.classList.remove("hidden");
  var cols = ["#4fb302","#f2b705","#1a9fd8","#e4484d","#8bd44a"];
  var bits = [];
  for(var i=0;i<90;i++){
    bits.push({
      x: w/2 + (Math.random()-.5)*w*.5, y: h*.32 + (Math.random()-.5)*70,
      vx: (Math.random()-.5)*9, vy: -Math.random()*13 - 3,
      s: 5 + Math.random()*7, r: Math.random()*Math.PI, vr:(Math.random()-.5)*.3,
      c: cols[i % cols.length]
    });
  }
  var t0 = performance.now();
  function frame(ts){
    var el = ts - t0;
    ctx.clearRect(0,0,w,h);
    ctx.globalAlpha = el > 1700 ? Math.max(0, 1 - (el-1700)/800) : 1;
    bits.forEach(function(b){
      b.vy += .42; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.vx *= .995;
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.r);
      ctx.fillStyle = b.c; ctx.fillRect(-b.s/2,-b.s/2,b.s,b.s*.62);
      ctx.restore();
    });
    if(el < 2500) requestAnimationFrame(frame);
    else{ ctx.clearRect(0,0,w,h); cv.classList.add("hidden"); }
  }
  requestAnimationFrame(frame);
}
})();
