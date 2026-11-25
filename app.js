'use strict';
/* La Voix d'Ambrine — classeur numérique CAA (HTML/CSS/JS sans framework) */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Mémoire de l’appareil pleine'); } } };

const SECTIONS = [
  { id: 'home', label: 'Accueil', ico: '🏠', color: '#6b3a9e' },
  { id: 'journee', label: 'Ma journée', ico: '📋', color: '#d9762b', type: 'dayplan' },
  { id: 'phrases', label: 'Je parle', ico: '🗣️', color: '#8a56c2', type: 'phrases', hidden: true },
  { id: 'anims', label: 'Ça bouge !', ico: '🎬', color: '#e0559a', type: 'anims', hidden: true },
  { id: 'communique', label: 'Je communique', ico: '💬', color: '#7c5cd6', groups: [['communique', '']] },
  { id: 'emotions', label: 'Mes émotions', ico: '💗', color: '#ef7fb0', groups: [['emotions', '']] },
  { id: 'besoins', label: 'J’ai besoin', ico: '💧', color: '#3ea0e6', groups: [['besoins', 'Besoins', 'Besoins'], ['besoins', 'Actions', 'Actions'], ['besoins', 'Mon corps', 'Mon corps']] },
  { id: 'jeux', label: 'Jeux et activités', ico: '🧩', color: '#f2a33a', groups: [['jeux', '']] },
  { id: 'nourriture', label: 'Je mange', ico: '🍽️', color: '#58b85d', groups: [['nourriture', '']] },
  { id: 'famille', label: 'Ma famille', ico: '👪', color: '#c9548f', type: 'family' },
  { id: 'jours', label: 'Les jours', ico: '📅', color: '#3b82a6', type: 'days' },
  { id: 'lieux', label: 'Lieux', ico: '📍', color: '#e8704f', groups: [['lieux', '']] },
  { id: 'raconter', label: 'Raconter', ico: '📖', color: '#2f9a9a', type: 'story' },
  { id: 'signes', label: 'Mes signes', ico: '🖐', color: '#2a6fdb', type: 'signs' },
  { id: 'favoris', label: 'Favoris', ico: '⭐', color: '#d9a21b', type: 'favs' },
  { id: 'reglages', label: 'Réglages parents', ico: '⚙️', color: '#6b7280', type: 'parent' },
];
const SEC = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

const S = {
  cards: [], signs: [], animIndex: {}, view: 'home',
  words: [], lastSpeech: '', story: LS.get('ambrine-story', []),
  favs: new Set(LS.get('ambrine-favs', [])), names: LS.get('ambrine-labels', {}),
  family: LS.get('ambrine-family', []),
  week: LS.get('ambrine-week', null), dayEdit: null,
  set: Object.assign({ animMode: 'touch', speakOnTap: true, rate: (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) ? 0.85 : 0.9, voiceURI: '', showLsf: true, forceAnim: false, stripPos: 'bottom', imgStyle: 'photo', wordMode: 'phrase', birthday: '2016-10-01', tileSize: 'grande', sound: true, immersive: false }, LS.get('ambrine-settings', {})),
  current: null,         // { canvas, rig }
  voices: [], flows: null, flow: null,
};
const saveSet = () => LS.set('ambrine-settings', S.set);
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const animAllowed = () => S.set.animMode !== 'off' && (!reduceQuery.matches || S.set.forceAnim);
const nameOf = c => S.names[c.id] ?? c.label;
const colorOf = c => (SEC[c.section] || SEC.communique).color;
const allCards = () => S.cards.concat(S.family.map(f => ({ id: f.id, label: f.label, section: 'famille', image: f.image, custom: true })));
const cardById = id => allCards().find(c => String(c.id) === String(id));

/* ------------------------------------------------------------------ voix */
function loadVoices() { S.voices = ('speechSynthesis' in window) ? speechSynthesis.getVoices() : []; updateVoiceWarn(); }
const frVoices = () => S.voices.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('fr'));
/* iPad/iPhone : écarter les voix « gadget » (Eloquence : Eddy, Flo, Grandma…) qui sonnent mal, préférer les voix naturelles */
const BAD_VOICE = /eddy|flo\b|grand-?ma|grand-?pa|grand-m|grand-p|reed|rocko|sandy|shelley|jacques|bad news|bells|bubbles|organ|whisper|zarvox|trinoids|albert|cellos|boing|wobble|superstar|junior|ralph|kathy|fred/i;
const GOOD_VOICE = /audrey|aur[ée]lie|am[ée]lie|marie|thomas|virginie|google|microsoft|denise|henri|julie|paul|hortense|claude/i;
const voiceScore = v => (BAD_VOICE.test(v.name) ? -100 : 0) + (GOOD_VOICE.test(v.name) ? 20 : 0) + (/enhanced|premium|am[ée]lior|natural|neural/i.test(v.name) ? 15 : 0) + (/fr[-_]FR/i.test(v.lang) ? 8 : 0) + (v.localService ? 5 : 0) + (v.default ? 2 : 0);
function pickVoice() {
  const fr = frVoices(); if (!fr.length) return null;
  const chosen = fr.find(v => v.voiceURI === S.set.voiceURI); if (chosen) return chosen;
  return fr.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}
function voiceStatus() {
  if (!('speechSynthesis' in window)) return { level: 'none', text: 'Cet appareil n’a pas de synthèse vocale. La phrase est affichée en grand à la place.' };
  const fr = frVoices();
  if (!fr.length) return { level: 'none', text: 'Aucune voix française trouvée sur cet appareil. Secours : la phrase est affichée en grand. Installez une voix française dans les réglages de l’appareil (Android : « Synthèse vocale » ; iPad : Accessibilité > Contenu énoncé > Voix).' };
  if (!fr.some(v => v.localService)) return { level: 'net', text: 'Voix française trouvée mais « en ligne » : elle peut se taire sans Internet. Installer une voix française hors ligne dans les réglages de l’appareil.' };
  return { level: 'ok', text: 'Voix française hors ligne disponible : ' + pickVoice().name + '.' };
}
function updateVoiceWarn() {
  const w = $('#voiceWarn'), st = voiceStatus();
  if (st.level === 'none' && !S.voiceWarnClosed) { w.hidden = false; w.textContent = '⚠ Pas de voix française : la phrase s’affichera en grand. (toucher pour fermer)'; }
  else w.hidden = true;
}
/* longue histoire : pendant qu'on construit, on montre seulement les 2 dernières phrases (les choix restent visibles) */
function lastBits(t) { const p = t.split(/(?<=\.) /); return p.length > 2 ? '… ' + p.slice(-2).join(' ') : t; }
function sentenceText(words) {
  const t = words.map((w, i) => w.say != null ? w.say : (i === 0 ? w.label : w.label.charAt(0).toLowerCase() + w.label.slice(1))).join(' ');
  const r = t.replace(/\s+/g, ' ').replace(/ ,/g, ',').replace(/,(\s*,)+/g, ',').replace(/,?\s*\.\s*/g, '. ').replace(/ et ((?:à|au|aux|j’ai) [^,.]*?)(?= et (?:à|au|aux|j’ai) )/g, ', $1').replace(/\. ([a-zàâéèêîôûç])/g, (m, l) => '. ' + l.toUpperCase()).replace(/ et (papa|maman|Yusuf|Nayla|mamie|papi|mes copines|la maîtresse|mon AESH)(?= et (papa|maman|Yusuf|Nayla|mamie|papi|mes copines|la maîtresse|mon AESH))/g, ', $1').trim();
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function speak(text, big = false) {
  if (!text) return; S.lastSpeech = text;
  const st = voiceStatus();
  if (st.level === 'none') { if (big) showBig(text); return; }
  try {
    const go = () => {
      const u = new SpeechSynthesisUtterance(text); const v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'fr-FR';
      u.rate = S.set.rate; u.pitch = 1; S.lastUtter = u;      // garder une référence (sinon Safari coupe parfois)
      speechSynthesis.speak(u);
    };
    if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(go, IOS ? 120 : 0); } else go();
    if (speechSynthesis.paused) speechSynthesis.resume();
  } catch (e) { if (big) showBig(text); }
}
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/* iPad : la voix doit être « débloquée » par un premier toucher, sinon les phrases dites après un délai restent muettes */
let voiceUnlocked = false;
function unlockVoice() {
  if (voiceUnlocked || !('speechSynthesis' in window)) return; voiceUnlocked = true;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { }
  loadVoices();
}
['touchend', 'pointerup', 'click'].forEach(ev => document.addEventListener(ev, unlockVoice, { capture: true, passive: true }));
function showBig(text) { $('#bigTextBody').textContent = text; if (!$('#bigText').open) $('#bigText').showModal(); }

/* ------------------------------------------------------------------ phrase */
function addWord(c) { S.words.push({ id: c.id, label: nameOf(c), image: c.image, emoji: c.emoji, anim: c.anim, color: colorOf(c) }); drawStrip(true); }
function drawStrip(added) {
  const t = $('#tokens'); t.replaceChildren();
  if (!S.words.length) { const p = document.createElement('span'); p.className = 'placeholder'; p.textContent = 'Je touche les images pour parler…'; t.append(p); return; }
  S.words.forEach((w, i) => { const el = tokEl(w, () => { speak(w.say != null && w.say !== '' ? w.say : w.label); playTok(el); });
    const x = h('span', 'tokX', '✕'); x.setAttribute('role', 'button'); x.setAttribute('aria-label', 'Enlever ' + w.label);
    const kill = e => { e.preventDefault(); e.stopPropagation(); removeWord(i); };
    x.addEventListener('click', kill); x.addEventListener('touchend', kill, { passive: false }); x.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    if (S.fix && S.fix.i === i) el.classList.add('fixing');
    const wrap = h('span', 'tokWrap'); wrap.append(el, x); t.append(wrap); });   // la croix à côté de la pièce (pas dedans) : sur iPad, un toucher dans un bouton va au bouton
  t.scrollLeft = t.scrollWidth;
  const band = $('#band');
  if (band && document.body.classList.contains('immersive')) {     // la bande grandit : on montre la dernière pièce, les boutons sont poussés à droite
    const last = t.lastElementChild; requestAnimationFrame(() => { if (last) band.scrollTo({ left: Math.max(0, last.offsetLeft + last.offsetWidth - band.clientWidth + 40), behavior: 'smooth' }); });
  }
  const last = t.lastElementChild;
  if (added && last && S.flyFrom) flyIn(last, S.flyFrom);
  S.flyFrom = null;
  if (added && last) {
    setTimeout(() => { last.classList.add('snap'); playSnap(); setTimeout(() => last.classList.remove('snap'), 700); }, S.flyFrom === null ? 400 : 40);
    setTimeout(() => playTok(last), 520);
  }
}
/* « clac » de puzzle : petit bruit fabriqué par l'iPad, marche sans Internet */
let AC = null;
function audioCtx() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
function playSnap() {
  if (S.set.sound === false) return; const ac = audioCtx(); if (!ac) return;
  const t = ac.currentTime;
  const click = (at, f, dur, vol) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 0.45, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(ac.destination); o.start(at); o.stop(at + dur + 0.02);
  };
  const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const ng = ac.createGain(); ng.gain.value = 0.35; n.buffer = b; n.connect(ng).connect(ac.destination); n.start(t);
  click(t, 900, 0.07, 0.35); click(t + 0.06, 1400, 0.09, 0.25);
  click(t + 0.13, 1046, 0.12, 0.12); click(t + 0.19, 1568, 0.16, 0.10);   // petite note joyeuse
}
['touchend', 'pointerup'].forEach(ev => document.addEventListener(ev, () => { if (AC && AC.state === 'suspended') AC.resume(); }, { capture: true, passive: true }));
function flyIn(el, from) {
  try {
    const to = el.getBoundingClientRect(); if (!to.width || !el.animate) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2), k = Math.max(.5, Math.min(2.2, from.width / to.width));
    el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${k})`, opacity: .95 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.15)' });
  } catch (e) { }
}
/* animation d'une image dans la bande de phrase */
function playTok(el) {
  if (!el) return;
  if (!el._anim) { bounceArt(el); return; }
  if (!animAllowed()) return;
  const cv = el.querySelector('canvas'); if (!cv) return;
  if (!el._rig) el._rig = Rig.load(cv, el._anim);
  el._rig.then(rig => { cv.classList.add('live'); rig.play({ amp: 1, onend: () => cv.classList.remove('live') }); }).catch(() => { });
}
let seqTimers = [];
function playSequence() {
  seqTimers.forEach(clearTimeout); seqTimers = [];
  const toks = [...$('#tokens').children].filter(x => x.classList.contains('tok')); let t = 0;
  S.words.forEach((w, i) => {
    const dur = Math.max(700, (w.say != null ? w.say : w.label).length * 90 / S.set.rate);
    seqTimers.push(setTimeout(() => { toks.forEach(x => x.classList.remove('speaking')); if (toks[i]) { toks[i].classList.add('speaking'); playTok(toks[i]); } }, t)); t += dur;
  });
  seqTimers.push(setTimeout(() => toks.forEach(x => x.classList.remove('speaking')), t));
}
const endP = t => /[.?!]$/.test(t) ? t : t + '.';
function sayStrip(big = true) { if (!S.words.length) return; speak(endP(sentenceText(S.words)), big); playSequence(); }
/* croix sur un picto de la bande : hors histoire → on l'enlève ; dans une histoire → on revient à SA question, le nouveau choix prend sa place */
function removeWord(i) {
  const w = S.words[i]; if (!w) return;
  const f = S.flow;
  S.fix = null; S.words.splice(i, 1);
  if (f) f.stack.forEach(st => { if (st.words.length > i) st.words.splice(i, 1); });
  drawStrip(); if (S.view === 'phrases' && f) renderPhrases();
}
function fixWord(it) {
  const fx = S.fix, f = S.flow; if (!fx || !f) return; S.fix = null;
  const i = fx.i, old = S.words[i];
  const apply = arr => { if (arr.length <= i) return; if (it.say === '') arr.splice(i, 1); else { const c = it.c; arr[i] = { ...arr[i], id: c.id, label: nameOf(c), say: (old.pre ? old.pre + ' ' : '') + it.say, image: c.image, emoji: c.emoji, anim: c.anim, color: colorOf(c) }; } };
  apply(S.words); f.stack.forEach(st => apply(st.words));
  drawStrip(); renderPhrases(); if (it.say) speak(sentenceText(S.words));
}
function tokEl(w, onclick) {
  const b = document.createElement('button'); b.className = 'tok'; b.style.setProperty('--tc', w.color); b.setAttribute('role', 'listitem');
  const i = h('div', 'tart');
  if (w.image) { const im = document.createElement('img'); im.src = w.image; im.alt = ''; i.append(im); } else i.append(h('div', 'emo', w.emoji || '•'));
  if (w.anim) { b._anim = w.anim; i.append(document.createElement('canvas')); }
  const s = document.createElement('span'); s.textContent = w.label;
  b.append(i, s); if (onclick) b.onclick = onclick; return b;
}
function sentenceSentence() { return sentenceText(S.words); }

/* ------------------------------------------------------------------ animation */
function stopCurrent() {
  if (S.current) { S.current.rig.stop(); S.current.rig.rest(); S.current.canvas.classList.remove('live'); S.current = null; }
}
function bounceArt(el) {
  if (!el || !animAllowed()) return;
  el.classList.remove('alive'); void el.offsetWidth; el.classList.add('alive');
  clearTimeout(el._aliveT); el._aliveT = setTimeout(() => el.classList.remove('alive'), 1500);
  const art = el.querySelector('.art, .tart'); if (!art) return;
  for (let i = 0; i < 6; i++) { const sp = h('i', 'spark'); sp.style.setProperty('--a', (i * 60 + Math.random() * 30) + 'deg'); sp.style.setProperty('--c', ['#ffd45e', '#ff7fc4', '#7fd3ff', '#9be27a', '#ffffff', '#c59bff'][i]); art.append(sp); setTimeout(() => sp.remove(), 900); }
}
async function playTile(tile, card, opts = {}) {
  if (!card.anim) { bounceArt(tile); return false; }
  if (!animAllowed()) return false;
  const canvas = tile.querySelector('canvas'); if (!canvas) return false;
  try {
    if (!tile._rig) tile._rig = Rig.load(canvas, card.anim);
    const rig = await tile._rig;
    stopCurrent(); S.current = { canvas, rig };
    canvas.classList.add('live');
    rig.play({ amp: opts.amp ?? 1, onend: () => { canvas.classList.remove('live'); if (S.current && S.current.canvas === canvas) S.current = null; } });
    return true;
  } catch (e) { console.warn('animation indisponible', e); return false; }
}
function onTile(tile, card) {
  S.flyFrom = S.dragFrom || tile.getBoundingClientRect(); S.dragFrom = null;
  tile.classList.remove('flash'); void tile.offsetWidth; tile.classList.add('flash');
  if (S.set.wordMode !== 'mot' && S.flows && card.section === 'nourriture' && orderFood(tile, card)) return;
  if (S.set.wordMode !== 'mot' && S.flows && card.section === 'famille' && PERSON[card.label]) { playTile(tile, card); if (S.set.speakOnTap) speak(nameOf(card)); setTimeout(() => openPerson(card), 300); return; }
  if (S.set.wordMode !== 'mot' && S.flows) {
    const list = startersFor(card);
    if (list.length) { playTile(tile, card); if (list.length === 1) { setTimeout(() => runStarter(list[0]), 300); return; } if (S.set.speakOnTap) speak(nameOf(card)); setTimeout(() => openStarters(card, list), 350); return; }
  }
  addWord(card);
  if (S.set.speakOnTap) speak(nameOf(card));
  playTile(tile, card);
  if (norm(card.label) === 'je veux' && S.flows) setTimeout(() => startFlow('veux', true), 450);
}

/* ------------------------------------------------------------------ glisser vers la phrase */
let DRAG = null;
document.addEventListener('touchmove', e => { if (DRAG) e.preventDefault(); }, { passive: false });
function overStrip(x, y) { const r = $('#strip').getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top - 20 && y <= r.bottom + 20; }
function enableDrag(el, act) {
  let timer = 0, sx = 0, sy = 0, id = null, started = false;
  const ghostOf = () => { const art = el.querySelector('.art'), g = art.cloneNode(true); g.className = 'ghost'; g.querySelectorAll('canvas').forEach(c => c.remove()); const r = art.getBoundingClientRect(); g.style.width = r.width + 'px'; g.style.height = r.height + 'px'; document.body.append(g); return g; };
  const start = (x, y) => { started = true; const g = ghostOf(); DRAG = { g, el }; el.classList.add('lifted'); move(x, y); try { navigator.vibrate && navigator.vibrate(15); } catch (e) { } };
  const move = (x, y) => { if (!DRAG) return; const r = DRAG.g.getBoundingClientRect(); DRAG.g.style.transform = `translate(${x - r.width / 2}px,${y - r.height / 2}px) scale(.82) rotate(-4deg)`; DRAG.g.classList.toggle('hot', overStrip(x, y)); $('#strip').classList.toggle('drop', overStrip(x, y)); };
  const end = (x, y, ok) => {
    clearTimeout(timer); if (!started) return; started = false; const d = DRAG; DRAG = null; $('#strip').classList.remove('drop');
    if (!d) return; d.el.classList.remove('lifted'); const gr = d.g.getBoundingClientRect(); d.g.remove();
    const block = e => { e.stopPropagation(); e.preventDefault(); }; window.addEventListener('click', block, true); setTimeout(() => window.removeEventListener('click', block, true), 450);
    if (ok && overStrip(x, y)) { S.dragFrom = gr; act(); }
  };
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.mini') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    sx = e.clientX; sy = e.clientY; id = e.pointerId; started = false; clearTimeout(timer);
    if (e.pointerType !== 'mouse') timer = setTimeout(() => start(sx, sy), 230);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    if (started) { move(e.clientX, e.clientY); return; }
    const d = Math.hypot(e.clientX - sx, e.clientY - sy);
    if (e.pointerType === 'mouse') { if (d > 8 && e.buttons) { start(e.clientX, e.clientY); try { el.setPointerCapture(id); } catch (x) { } } }
    else if (d > 12) clearTimeout(timer);
  });
  el.addEventListener('pointerup', e => { if (e.pointerId === id) end(e.clientX, e.clientY, true); clearTimeout(timer); });
  el.addEventListener('pointercancel', e => { if (e.pointerId === id) end(e.clientX, e.clientY, false); clearTimeout(timer); });
}

/* ------------------------------------------------------------------ cartes (pièces de puzzle) */
function makeTile(card, opts = {}) {
  const el = document.createElement('div'); el.className = 'piece' + (card.style === 'photo' && !card.anim ? ' photo' : ''); el.style.setProperty('--pc', colorOf(card));
  el.setAttribute('role', 'button'); el.tabIndex = 0; el.dataset.id = card.id;
  el.setAttribute('aria-label', nameOf(card) + (card.anim ? ', animé' : ''));
  const art = document.createElement('div'); art.className = 'art';
  if (card.image) { const img = document.createElement('img'); img.src = card.image; img.alt = ''; img.loading = 'lazy'; img.draggable = false; art.append(img); }
  else { art.classList.add('emoArt'); art.append(h('span', 'emo', card.emoji || '•')); }
  if (card.anim) { const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); art.append(cv); }
  const name = document.createElement('div'); name.className = 'name'; name.textContent = nameOf(card);
  el.append(art, name);
  const mini = (cls, txt, label, fn) => { const b = document.createElement('button'); b.className = 'mini ' + cls; b.textContent = txt; b.setAttribute('aria-label', label); b.addEventListener('click', e => { e.stopPropagation(); fn(b); }); b.addEventListener('keydown', e => e.stopPropagation()); el.append(b); return b; };
  if (card.anim) { el.classList.add('animated'); }
  const act = opts.pick ? () => { S.flyFrom = S.dragFrom || el.getBoundingClientRect(); S.dragFrom = null; playTile(el, card); opts.pick(el); } : () => onTile(el, card);
  enableDrag(el, act);
  if (opts.pick) { el.addEventListener('click', act); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }); return el; }
  const fv = mini('fav' + (S.favs.has(card.id) ? ' is' : ''), S.favs.has(card.id) ? '★' : '☆', 'Favori', b => { toggleFav(card.id); b.classList.toggle('is', S.favs.has(card.id)); b.textContent = S.favs.has(card.id) ? '★' : '☆'; if (S.view === 'favoris') renderView(); });
  if (card.sign && S.set.showLsf) mini('lsf', '🖐', 'Voir le signe LSF de référence', () => openSign(card.sign, nameOf(card)));
  el.addEventListener('click', () => onTile(el, card));
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTile(el, card); } });
  return el;
}
function toggleFav(id) { S.favs.has(id) ? S.favs.delete(id) : S.favs.add(id); LS.set('ambrine-favs', [...S.favs]); }
function gridOf(cards) { const g = document.createElement('div'); g.className = 'grid'; cards.forEach(c => g.append(makeTile(c))); return g; }
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

/* ------------------------------------------------------------------ vues */
function viewTitle(sec) { const t = h('h1'); t.append(h('span', '', sec.ico), document.createTextNode(sec.label)); return t; }
function renderHome() {
  const v = $('#view-home'); v.replaceChildren();
  const hello = h('div', 'homeHello'); const im = ambrineVideo('assets/video/ambrine_salut.mp4', false);
  im.classList.add('helloVid'); im.onclick = () => { try { im.currentTime = 0; im.play(); } catch (e) { } speak('Coucou, je suis Ambrine !'); };
  hello.append(im, h('h1', '', 'Bonjour Ambrine !')); v.append(hello);
  setTimeout(() => { if (animAllowed()) im.play().catch(() => { }); }, 400);
  const g = h('div', 'themes');
  THEMES.forEach(t => { const b = h('button', 'theme'); b.style.setProperty('--tc', t.color); b.append(picEl(lookup(t.pic) || { emoji: t.emoji }), h('span', '', t.lab)); b.onclick = () => { S.words = []; drawStrip(); t.go(); }; g.append(b); });
  v.append(g);
}
/* l'Accueil : 8 portes d'entrée, chacune ouvre des images qui construisent la phrase */
const THEMES = [
  { lab: 'Ma journée', pic: 'Ma journée', emoji: '📅', color: '#f2862e', go: () => go('journee') },
  { lab: 'Je mange', pic: 'Manger', emoji: '🍽️', color: '#35b24a', go: () => go('nourriture') },
  { lab: 'J’ai besoin', pic: 'Toilettes', emoji: '💧', color: '#2196e8', go: () => go('besoins') },
  { lab: 'Je ressens', pic: 'Contente', emoji: '💗', color: '#ec4f9a', go: () => startFlow('suis') },
  { lab: 'Je joue', pic: 'Puzzle', emoji: '🧩', color: '#f4b400', go: () => startFlow('joue') },
  { lab: 'Ma famille', pic: 'Tout le monde', emoji: '👨‍👩‍👧', color: '#8b57d9', go: () => go('famille') },
  { lab: 'Je vais', pic: 'Sortir', emoji: '🚌', color: '#14ae9f', go: () => startFlow('vais') },
  { lab: 'Je demande', pic: 'Tu viens ?', emoji: '👋', color: '#ff7043', go: () => startFlow('demande') }];
function renderCards(sec) {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(sec));
  if (sec.id === 'besoins') { const r = h('div', 'flowRoots'); [['veux', 'Je veux…', 'Je veux'], ['mal', 'J’ai mal…', 'J’ai mal à la tête']].forEach(([k, lab, pic]) => { const b = h('button', 'flowBtn big'); b.append(picEl(lookup(pic)), h('span', '', lab)); b.onclick = () => startFlow(k); r.append(b); }); v.append(r); }
  sec.groups.forEach(([section, , cat]) => {
    let list = S.cards.filter(c => c.section === section && (!cat || c.category === cat));
    if (!list.length) return;
    if (cat) v.append(h('h2', '', cat));
    v.append(gridOf(list));
  });
}
function renderFamily(sec) {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(sec));
  const list = allCards().filter(c => c.section === 'famille');
  v.append(gridOf(list));
  v.append(h('p', 'hint', 'Un parent peut ajouter d’autres personnes avec une photo : Réglages parents (maintenir l’engrenage) > Ma famille.'));
}
function renderFavs() {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(SEC.favoris));
  const list = allCards().filter(c => S.favs.has(c.id));
  if (!list.length) v.append(h('div', 'empty', 'Touche ☆ sur une image pour la retrouver ici.')); else v.append(gridOf(list));
}
function renderStory() {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(SEC.raconter));
  v.append(h('p', 'hint', 'Compose une phrase dans la bande du haut, puis ajoute-la à l’histoire. Ensuite on peut la lire en entier.'));
  const bar = h('div', 'row'); const add = h('button', 'btn primary', '➕ Ajouter ma phrase à l’histoire');
  add.onclick = () => { if (!S.words.length) { toast('La bande de phrase est vide'); return; } S.story.push(S.words.map(w => ({ ...w }))); LS.set('ambrine-story', S.story); S.words = []; drawStrip(); renderStory(); };
  const read = h('button', 'btn', '🔊 Lire l’histoire'); read.onclick = () => { const t = S.story.map(s => endP(sentenceText(s))).join(' '); if (t) speak(t, true); };
  const clr = h('button', 'btn', '🗑 Effacer l’histoire'); clr.onclick = () => { if (confirm('Effacer toute l’histoire ?')) { S.story = []; LS.set('ambrine-story', S.story); renderStory(); } };
  bar.append(add, read, clr); v.append(bar);
  if (!S.story.length) v.append(h('div', 'empty', 'L’histoire est vide.'));
  S.story.forEach((s, i) => {
    const r = h('div', 'storyRow'); s.forEach(w => r.append(tokEl(w))); const a = h('div', 'acts');
    const p = h('button', 'btn', '🔊'); p.setAttribute('aria-label', 'Dire cette phrase'); p.onclick = () => speak(endP(sentenceText(s)), true);
    const d = h('button', 'btn', '✕'); d.setAttribute('aria-label', 'Supprimer cette phrase'); d.onclick = () => { S.story.splice(i, 1); LS.set('ambrine-story', S.story); renderStory(); };
    a.append(p, d); r.append(a); v.append(r);
  });
}
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
function renderSigns() {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(SEC.signes));
  v.append(h('p', 'hint', 'Vidéos de référence pour voir de vrais signes LSF (Elix et AutiSignes). Ce ne sont pas des animations du personnage.'));
  const tools = h('div', 'signTools'); const inp = h('input'); inp.type = 'search'; inp.placeholder = 'Chercher un signe…'; inp.setAttribute('aria-label', 'Chercher un signe');
  const sel = h('select'); sel.setAttribute('aria-label', 'Catégorie'); sel.append(new Option('Toutes les catégories', ''));
  [...new Set(S.signs.map(s => s.category))].sort((a, b) => a.localeCompare(b, 'fr')).forEach(c => sel.append(new Option(c, c)));
  const cnt = h('div', 'hint'); const list = h('div', 'signList');
  const draw = () => {
    const t = norm(inp.value.trim()), c = sel.value;
    const m = S.signs.filter(s => (!c || s.category === c) && (!t || norm(s.label + ' ' + s.category + ' ' + s.source).includes(t)));
    cnt.textContent = m.length + ' vidéo(s)'; list.replaceChildren();
    m.forEach(s => { const b = h('button', 'signitem'); b.append(h('strong', '', '▶ ' + s.label), h('small', '', s.source + ' · ' + s.category)); b.onclick = () => openSign(s.id, s.label); list.append(b); });
  };
  inp.oninput = draw; sel.onchange = draw; tools.append(inp, sel); v.append(tools, cnt, list); draw();
}

/* ------------------------------------------------------------------ phrases guidées */
const lookup = lab => S.cards.find(c => norm(c.label) === norm(lab));
function rootBtn(r, big) {
  const c = lookup(r.pic); const b = h('button', 'flowBtn' + (big ? ' big' : ''));
  if (c && c.image) { const i = document.createElement('img'); i.src = c.image; i.alt = ''; b.append(i); }
  else if (c && c.emoji) b.append(h('div', 'emo', c.emoji));
  b.append(h('span', '', r.label)); b.onclick = () => startFlow(r.key); return b;
}
function startFlow(key, keepWords, silent) {
  if (!S.flows) return; S.fix = null;
  const r = S.flows.roots.find(x => x.key === key); if (!r) return;
  stopCurrent();
  if (!keepWords) { S.words = []; const c = lookup(r.pic); S.words.push({ id: c.id, label: r.word.label, say: r.word.say, pre: '', stub: true, image: c.image, anim: c.anim, color: colorOf(c) }); }
  else { const w = S.words[S.words.length - 1]; S.words = w ? [{ ...w, say: 'je veux', pre: '', stub: true }] : []; }
  drawStrip();
  S.flow = { key, done: false, stack: [{ node: r.node, words: S.words.map(w => ({ ...w })) }] };
  S.starter = null; S.view = 'phrases'; renderView(); if (!silent && !keepWords && r.word.say) speak(r.word.say.replace(/,$/, ''));
}
function pickItem(it) {
  const f = S.flow; if (!f || f.done) return;
  const c = it.c, top = f.stack[f.stack.length - 1], node = top.node;
  let pre = (top.again && node.preAgain) ? node.preAgain : (node.pre || '');
  if (it.replace) {
    const last = S.words[S.words.length - 1];
    if (last && last.stub) { S.words.pop(); pre = last.pre || ''; } else if (node.preReplace != null) pre = node.preReplace;
  }
  if (it.say !== '') S.words.push({ id: c.id, label: nameOf(c), say: (pre ? pre + ' ' : '') + it.say, pre, node, stub: !!it.next, image: c.image, emoji: c.emoji, anim: c.anim, color: colorOf(c) });
  drawStrip(it.say !== '');
  if (it.next) { f.stack.push({ node: it.next, words: S.words.map(w => ({ ...w })) }); if (S.set.speakOnTap && it.say) speak(it.say); renderPhrases(); }
  else {
    f.done = true; addPersonEnd(); const r = S.flows.roots.find(x => x.key === f.key);
    f.cont = it.say === '' ? (r && r.cont) : (node.cont || (r && r.cont)) || null;
    setTimeout(() => sayStrip(false), 450); renderPhrases();
  }
}
function flowMore() {
  const f = S.flow; if (!f || !f.cont) return;
  f.done = false; f.stack.push({ node: f.cont, again: true, words: S.words.map(w => ({ ...w })) }); renderPhrases();
}
function flowBack() {
  const f = S.flow; if (!f) return; if (S.fix) { S.fix = null; renderPhrases(); return; }
  if (f.done) { f.done = false; S.words = f.stack[f.stack.length - 1].words.map(w => ({ ...w })); drawStrip(); renderPhrases(); return; }
  if (f.stack.length > 1) { f.stack.pop(); S.words = f.stack[f.stack.length - 1].words.map(w => ({ ...w })); drawStrip(); renderPhrases(); }
  else { S.flow = null; S.words = []; drawStrip(); renderPhrases(); }
}

/* ------------------------------------------------------------------ chaque mot lance une phrase */
function applyItem(words, node, it) {
  let pre = node.pre || '';
  if (it.replace) { const last = words[words.length - 1]; if (last && last.stub) { words.pop(); pre = last.pre || ''; } else if (node.preReplace != null) pre = node.preReplace; }
  if (it.say !== '') words.push({ label: it.c.label, say: (pre ? pre + ' ' : '') + it.say, pre, stub: !!it.next });
  return words;
}
const START_LABEL = { veux: 'Je veux…', vais: 'Je vais…', raconte: 'Je raconte', demande: 'Je demande', suis: 'Je suis…', mal: 'J’ai mal…' };
function startersFor(card) {
  const L = norm(card.label), out = [], seen = new Set();
  const add = (r, path) => {
    let words = [{ label: r.word.label, say: r.word.say, pre: '', stub: true }]; let node = r.node;
    path.forEach(it => { words = applyItem(words, node, it); node = it.next || node; });
    const prev = sentenceText(words); if (!prev || seen.has(prev)) return; seen.add(prev);
    out.push({ key: r.key, path, prev: prev + (path[path.length - 1].next ? ' …' : (/[.?!]$/.test(prev) ? '' : '.')), depth: path.length });
  };
  S.flows.roots.filter(r => START_LABEL[r.key]).forEach(r => {
    const n0 = out.length, cap = () => out.length - n0 >= 2;
    if (r.key === 'demande') {      // à qui ? (la personne) ou passer → la demande
      const who = r.node.items.find(it => norm(it.c.label) === L); if (who) add(r, [who]);
      const skip = r.node.items.find(it => norm(it.c.label) === 'passer');
      const q = skip && skip.next.items.find(it => norm(it.c.label) === L); if (q && !cap()) add(r, [skip, q]);
      return;
    }
    if (r.key === 'raconte') {      // aujourd'hui → où → (passer) → quoi
      // aujourd'hui → comment (passer) → avec qui (passer) → où → quoi
      const when = r.node, today = when.items[0], how = today.next;
      const sk = n => n && n.items.find(it => it.next && it.say === '' && norm(it.c.label) === 'passer');
      const s1 = sk(how), who = s1 && s1.next, s2 = sk(who), where = s2 && s2.next;
      if (where) {
        const w = where.items.find(it => norm(it.c.label) === L); if (w) add(r, [today, s1, s2, w]);
        const s3 = sk(where); if (s3) { const d = s3.next.items.find(it => norm(it.c.label) === L); if (d && !cap()) add(r, [today, s1, s2, s3, d]); }
      }
      return;
    }
    const found = [];
    const walk = (node, path, depth) => {
      if (!node || depth > 3) return;
      node.items.forEach(it => {
        if (!it.c || norm(it.c.label) === 'tres contente') return;
        if (norm(it.c.label) === L) found.push(path.concat([it]));
        if (it.next && it.next !== node && depth < 3 && !path.includes(it)) walk(it.next, path.concat([it]), depth + 1);
      });
    };
    walk(r.node, [], 1);
    found.sort((a, b) => a.length - b.length).forEach(p => { if (!cap()) add(r, p); });
  });
  return out.sort((a, b) => a.depth - b.depth).slice(0, 9);
}
/* nourriture : comme une borne de commande. Pizza → « je veux manger de la pizza » → sauce → boisson → dessert */
function orderFood(tile, card) {
  const L = norm(card.label);
  for (const key of ['repas', 'repasBoire', 'repasSauce']) {
    const r = S.flows.roots.find(x => x.key === key); const it = r && r.node.items.find(i => i.c && norm(i.c.label) === L);
    if (it) { playTile(tile, card); setTimeout(() => runStarter({ key, path: [it] }), 300); return true; }
  }
  return false;
}
/* une personne d'abord : Papa → les boutons de l'Accueil, et « avec papa » s'ajoute tout seul */
const PERSON = { Papa: 'papa', Maman: 'maman', Mamie: 'mamie', Papi: 'papi', Yusuf: 'Yusuf', Nayla: 'Nayla', Copines: 'mes copines', Orthophoniste: 'l’orthophoniste', 'Mon AESH': 'mon AESH' };
const KIDS = ['Yusuf', 'Nayla', 'Copines'];
function openPerson(card) { S.person = { card, txt: PERSON[card.label] }; S.flow = null; S.starter = null; S.words = []; addWord(card); S.view = 'phrases'; renderView(); }
function personWord() { const p = S.person, c = p.card; return { id: c.id, label: nameOf(c), say: 'avec ' + p.txt, pre: '', image: c.image, emoji: c.emoji, color: colorOf(c) }; }
function addPersonEnd() {
  const p = S.person; if (!p || !S.flow || ['demande', 'jouerEns'].includes(S.flow.key)) return;
  if (sentenceText(S.words).toLowerCase().includes(p.txt.toLowerCase())) return;
  S.words.push(personWord()); drawStrip(true);
}
function renderPerson() {
  const p = S.person, c = p.card, v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(SEC.phrases));
  const head = h('div', 'flowHead starterHead'); head.append(picEl(c), h('div', 'flowSentence', nameOf(c) + ' …')); v.append(head);
  const bar = h('div', 'row flowBar'); const back = h('button', 'btn', '⬅ Retour'); back.onclick = () => { S.person = null; S.words = []; drawStrip(); go('famille'); }; bar.append(back); v.append(bar);
  const g = h('div', 'flowRoots starterPics');
  const tile = (card, lab, fn, cls) => { const b = h('button', 'flowBtn big ' + (cls || '')); b.append(picEl(card), h('span', '', lab)); b.onclick = fn; return b; };
  g.append(tile(c, nameOf(c), () => { speak(nameOf(c)); S.person = null; go('famille'); }, 'justWord'));
  const st = startersFor(c), L = norm(c.label);
  const run = x => () => { const keep = S.person; runStarter(x); S.person = keep; };
  if (KIDS.includes(c.label)) g.append(tile(lookup('Puzzle'), 'On joue ?', () => {
    const keep = S.person; startFlow('jouerEns', false, true); S.person = keep;
    S.words = [{ id: c.id, label: nameOf(c), say: (c.label === 'Copines' ? 'les copines' : p.txt) + ',', pre: '', image: c.image, color: colorOf(c) }];
    S.flow.stack[0].words = S.words.map(w => ({ ...w })); drawStrip(); renderPhrases(); speak(sentenceText(S.words).replace(/,$/, '')); }));
  const dem = st.find(x => x.key === 'demande' && x.path.length === 1); if (dem) g.append(tile(lookup('Tu viens ?'), 'Je demande', run(dem)));
  const voir = st.find(x => x.key === 'veux' && norm(x.path[0].c.label).startsWith('voir')); if (voir) g.append(tile(x0(voir.path[0].c), 'Voir', run(voir)));
  const hug = st.find(x => x.key === 'veux' && norm(x.path[0].c.label) === 'calin'); if (hug) g.append(tile(lookup('Câlin'), 'Câlin', run(hug)));
  S.flows.roots.filter(r => ['ajd', 'demain', 'veux', 'raconte', 'suis'].includes(r.key)).forEach(r => g.append(tile(lookup(r.pic), r.label, () => { const keep = S.person; startFlow(r.key); S.person = keep; })));
  v.append(g);
}
function x0(c) { return lookup(c.label) || c; }
function finishFlow() { const f = S.flow; if (!f || !S.words.length) return; f.done = true; addPersonEnd(); f.cont = null; sayStrip(false); renderPhrases(); }
function openStarters(card, list) {
  S.starter = { card, list, back: S.view === 'phrases' ? 'home' : S.view }; S.flow = null; S.view = 'phrases'; renderView();
}
function runStarter(st) {
  const old = S.set.speakOnTap; S.set.speakOnTap = false;
  startFlow(st.key, false, true);
  st.path.forEach(it => pickItem(it));
  S.set.speakOnTap = old;
  if (S.flow && !S.flow.done) speak(sentenceText(S.words));
}
function renderStarter() {
  const st = S.starter, v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(SEC.phrases));
  const head = h('div', 'flowHead starterHead');
  if (st.card.image) head.append(Object.assign(document.createElement('img'), { src: st.card.image, alt: '' })); else head.append(h('div', 'emo', st.card.emoji || '•'));
  head.append(h('div', 'flowSentence', nameOf(st.card) + ' …')); v.append(head);
  const bar = h('div', 'row flowBar');
  const back = h('button', 'btn', '⬅ Retour'); back.onclick = () => { const b = st.back; S.starter = null; go(b); };
  const word = h('button', 'btn', '🔤 Juste le mot'); word.onclick = () => { addWord(st.card); speak(nameOf(st.card)); const b = st.back; S.starter = null; go(b); };
  bar.append(back); v.append(bar);
  const g = h('div', 'flowRoots starterPics');
  const tile = (card, lab, fn, cls) => { const b = h('button', 'flowBtn big ' + (cls || '')); b.append(picEl(card), h('span', '', lab)); b.onclick = fn; return b; };
  g.append(tile(st.card, nameOf(st.card), () => { addWord(st.card); speak(nameOf(st.card)); const b = st.back; S.starter = null; go(b); }, 'justWord'));
  const ROOTPIC = { veux: 'Je veux', vais: 'Sortir', raconte: 'Lire', demande: 'Tu viens ?', suis: 'Contente' };
  const ROOTLAB = { veux: 'Je veux', vais: 'Je vais', raconte: 'Je raconte', demande: 'Je demande', suis: 'Je suis' };
  const seen = new Set(), L = norm(st.card.label);
  st.list.forEach(x => {
    const it = x.key === 'raconte' ? null : x.path.find(i => i.c && norm(i.c.label) !== L && !['aujourd’hui', "aujourd'hui", 'passer'].includes(norm(i.c.label)));
    let card, lab;
    if (it) { card = lookup(it.c.label) || it.c; lab = (it.c.label || '').replace(/…$/, ''); }
    else { card = lookup(ROOTPIC[x.key]); lab = ROOTLAB[x.key]; }
    if (!lab || seen.has(norm(lab)) || seen.size >= 6) return; seen.add(norm(lab));
    g.append(tile(card, lab, () => runStarter(x)));
  });
  v.append(g);
}
function renderPhrases() {
  if (S.starter) return renderStarter();
  if (S.person && !S.flow) return renderPerson();
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(SEC.phrases));
  const f = S.flow;
  if (!f) {
    go('home'); return;
  }
  if (S.fix) {   // remplacer un picto : on montre SA question
    const fx = S.fix, node = fx.w.node;
    v.append(h('div', 'flowHead fixHead', '✏️ Je change « ' + fx.w.label + ' »'));
    const bar = h('div', 'row flowBar'); const no = h('button', 'btn', '⬅ Garder'); no.onclick = () => { S.fix = null; renderPhrases(); }; bar.append(no); v.append(bar);
    v.append(h('h2', '', node.title));
    const others = sentenceText(S.words.filter((_, k) => k !== fx.i)).toLowerCase();
    const g = h('div', 'grid');
    node.items.filter(it => !(node.hideUsed && it.say && others.includes(it.say.replace(/^et /, '').toLowerCase()))).forEach(it => {
      if (it.say === '') return;   // Passer, Continuer, Rien… : on a « Enlever » à la place
      g.append(makeTile(Object.assign({}, it.c), { pick: () => fixWord(it) })); });
    const del = makeTile({ id: 'i_enlever', label: 'Enlever', emoji: '🗑️', section: 'communique' }, { pick: () => fixWord({ say: '' }) });
    g.append(del); v.append(g); return;
  }
  const cur = f.stack[f.stack.length - 1].node;
  const head = h('div', 'flowHead'); head.append(h('div', 'flowSentence', S.words.length ? (f.done ? endP(sentenceText(S.words)) : lastBits(sentenceText(S.words)) + ' …') : cur.title));
  v.append(head);
  const bar = h('div', 'row flowBar');
  const back = h('button', 'btn', '⬅ Retour'); back.onclick = flowBack;
  const say = h('button', 'btn primary', '🔊 Dire'); say.onclick = () => sayStrip(true);
  const again = h('button', 'btn', '🔄 Recommencer'); again.onclick = () => { S.flow = null; S.words = []; drawStrip(); renderPhrases(); };
  bar.append(back, say, again); v.append(bar);
  if (f.done) {
    v.append(h('div', 'flowDone', '✔ C’est dit !'));
    if (f.cont) { const g = h('div', 'flowRoots'); const m = h('button', 'flowBtn big more'); m.append(h('div', 'emo', '➕'), h('span', '', 'Et après…')); m.onclick = flowMore;
      const e = h('button', 'flowBtn big end'); e.append(h('div', 'emo', '✅'), h('span', '', 'C’est tout')); e.onclick = () => { S.flow = null; renderPhrases(); }; g.append(m, e); v.append(g); }
    else { const g = h('div', 'flowRoots'); const e = h('button', 'flowBtn big end'); e.append(h('div', 'emo', '✅'), h('span', '', 'C’est tout')); e.onclick = () => { S.flow = null; renderPhrases(); }; g.append(e); v.append(g); }
    return;
  }
  if (S.person) {   // la personne choisie au début : on la met toute seule à l'étape « avec qui ? »
    const want = ('avec ' + S.person.txt).toLowerCase(), it = cur.items.find(i => i.say && i.say.toLowerCase() === want);
    if (it && !sentenceText(S.words).toLowerCase().includes(S.person.txt.toLowerCase())) { setTimeout(() => pickItem(it), 0); }
  }
  v.append(h('h2', '', cur.title));
  if (cur.fini && S.words.length) { const fb = h('button', 'flowBtn big finiBtn'); fb.append(h('div', 'emo', '✅'), h('span', '', 'Fini')); fb.onclick = finishFlow; v.append(fb); }
  const g = h('div', 'grid');
  const said = sentenceText(S.words).toLowerCase();
  cur.items.filter(it => !(cur.hideUsed && it.say && said.includes(it.say.replace(/^et /, '').toLowerCase()))).forEach(it => { const c = Object.assign({}, it.c); g.append(makeTile(c, { pick: () => pickItem(it) })); });
  v.append(g);
}

/* ------------------------------------------------------------------ les jours */
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function sayDay(prefix, day, pic) {
  const c = S.cards.find(x => norm(x.label) === norm(pic)), d = S.cards.find(x => norm(x.label) === norm(day));
  S.words = [{ id: c.id, label: c.label, say: prefix, emoji: c.emoji, color: colorOf(c) }, { id: d.id, label: d.label, say: day, emoji: d.emoji, color: colorOf(d) }];
  drawStrip(); sayStrip(false);
}
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DCOL = '#3b82a6';
function dateWord(label, say, emoji) { return { id: 'd_' + label, label, say, emoji, color: DCOL }; }
function todayWords() {
  const d = new Date();
  return [dateWord('Aujourd’hui', 'aujourd’hui, on est', '📍'), dateWord(JOURS[d.getDay()], JOURS[d.getDay()], '📅'), dateWord(String(d.getDate()), d.getDate() === 1 ? 'premier' : String(d.getDate()), String(d.getDate())), dateWord(MOIS[d.getMonth()], MOIS[d.getMonth()], '🗓️'), dateWord(String(d.getFullYear()), String(d.getFullYear()), String(d.getFullYear()))];
}
function renderDate(sec) {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(sec));
  const f = S.dateFlow, steps = ['Quel jour ?', 'Quel numéro ?', 'Quel mois ?', 'Quelle année ?'];
  const head = h('div', 'flowHead'); head.append(h('div', 'flowSentence', f.step >= 4 ? sentenceText(S.words) + '.' : (S.words.length ? sentenceText(S.words) + ' …' : steps[0]))); v.append(head);
  const bar = h('div', 'row flowBar');
  const back = h('button', 'btn', '⬅ Retour'); back.onclick = () => { if (f.step === 0) { S.dateFlow = null; S.words = []; drawStrip(); } else { f.step--; S.words.pop(); drawStrip(); } renderDays(SEC.jours); };
  const say = h('button', 'btn primary', '🔊 Dire'); say.onclick = () => sayStrip(true);
  const tod = h('button', 'btn', '📍 Aujourd’hui'); tod.onclick = () => { S.words = todayWords(); drawStrip(); f.step = 4; sayStrip(false); renderDays(SEC.jours); };
  const done = h('button', 'btn', '✅ C’est tout'); done.onclick = () => { f.step = 4; sayStrip(false); renderDays(SEC.jours); };
  const again = h('button', 'btn', '🔄 Recommencer'); again.onclick = () => { S.words = []; drawStrip(); S.dateFlow = { step: 0 }; renderDays(SEC.jours); };
  bar.append(back, say, tod); if (f.step >= 2 && f.step < 4) bar.append(done); bar.append(again); v.append(bar);
  if (f.step >= 4) { v.append(h('div', 'flowDone', '✔ C’est dit !')); return; }
  v.append(h('h2', '', steps[f.step]));
  let items = [];
  if (f.step === 0) items = JOURS.slice(1).concat(JOURS[0]).map(j => [j, j, '📅']);
  if (f.step === 1) items = Array.from({ length: 31 }, (_, i) => [String(i + 1), i === 0 ? 'premier' : String(i + 1), String(i + 1)]);
  if (f.step === 2) items = MOIS.map(m => [m, m, '🗓️']);
  if (f.step === 3) { const y = new Date().getFullYear(); items = [y - 1, y, y + 1, y + 2].map(a => [String(a), String(a), String(a)]); }
  const g = h('div', 'grid');
  items.forEach(([label, say, emoji]) => {
    const c = { id: 'd_' + label, label: label.charAt(0).toUpperCase() + label.slice(1), emoji, section: 'jours' };
    g.append(makeTile(c, { pick: () => { S.words.push(dateWord(label, say, emoji)); drawStrip(); f.step++; if (S.set.speakOnTap) speak(say); if (f.step >= 4) sayStrip(false); renderDays(SEC.jours); } }));
  });
  v.append(g);
}
const NOMBRES = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit'];
function birthdayInfo() {
  const [y, m, d] = (S.set.birthday || '2016-10-01').split('-').map(Number), now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let age = now.getFullYear() - y; if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  let next = new Date(now.getFullYear(), m - 1, d); if (next < t0) next = new Date(now.getFullYear() + 1, m - 1, d);
  const days = Math.round((next - t0) / 86400000);
  return { day: d, month: MOIS[m - 1], age, days, today: days === 0 };
}
function birthdaySay() {
  const b = birthdayInfo(), j = b.day === 1 ? 'premier' : String(b.day);
  if (b.today) return `Aujourd’hui, c’est mon anniversaire ! J’ai ${NOMBRES[b.age] || b.age} ans.`;
  return `Mon anniversaire, c’est le ${j} ${b.month}. J’ai ${NOMBRES[b.age] || b.age} ans. C’est dans ${b.days} jours.`;
}
function ambrineVideo(src, loop) {   // Ambrine qui fait coucou (vidéo des parents), muette
  const v = document.createElement('video'); v.src = src; v.muted = true; v.defaultMuted = true; v.playsInline = true;
  v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto'; v.poster = 'assets/cards/ambrine_coucou_poster.jpg';
  if (loop && animAllowed()) { v.loop = true; v.autoplay = true; v.setAttribute('autoplay', ''); }
  return v;
}
function birthdayCard() {
  const b = birthdayInfo(), el = h('button', 'bdayCard' + (b.today ? ' today' : ''));
  const vid = ambrineVideo('assets/video/ambrine_coucou.mp4', true); el.append(vid);
  const t = h('div', 'bdayText');
  t.append(h('small', '', '🎂 Mon anniversaire'), h('strong', '', (b.day === 1 ? '1er' : b.day) + ' ' + b.month),
    h('span', '', b.today ? 'C’est aujourd’hui ! Joyeux anniversaire !' : 'J’ai ' + b.age + ' ans · dans ' + b.days + ' jours'));
  el.append(t); el.onclick = () => speak(birthdaySay(), true); return el;
}
function renderDays(sec) {
  if (S.dateFlow) return renderDate(sec);
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(sec));
  const n = new Date().getDay(), today = JOURS[n], tomorrow = JOURS[(n + 1) % 7], yest = JOURS[(n + 6) % 7];
  const ban = h('div', 'dayBanner');
  const mk = (cls, small, big, fn) => { const b = h('button', 'dayBtn ' + cls); b.append(h('small', '', small), h('strong', '', big)); b.onclick = fn; return b; };
  ban.append(
    mk('now', 'Aujourd’hui, on est', today, () => sayDay('aujourd’hui, on est', today, 'Aujourd’hui')),
    mk('', 'Demain, c’est', tomorrow, () => sayDay('demain, c’est', tomorrow, 'Demain')),
    mk('', 'Hier, c’était', yest, () => sayDay('hier, c’était', yest, 'Hier')));
  const qd = h('button', 'dayBtn pick'); qd.append(h('small', '', 'Je choisis la date'), h('strong', '', '📆 Quelle date ?')); qd.onclick = () => { S.words = []; drawStrip(); S.dateFlow = { step: 0 }; renderDays(sec); };
  ban.append(qd); v.append(ban);
  v.append(birthdayCard());
  v.append(h('p', 'hint', 'Les jours changent tout seuls avec la date de la tablette. Je peux aussi toucher un jour dans la liste.'));
  v.append(gridOf(S.cards.filter(c => c.section === 'jours')));
}

/* ------------------------------------------------------------------ images qui bougent */
function renderAnims(sec) {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(sec));
  v.append(h('p', 'hint', 'Ici, toutes les images qui bougent. Je touche une image : elle bouge, puis elle revient comme avant.'));
  const list = S.cards.filter(c => c.anim);
  if (!list.length) { v.append(h('div', 'empty', 'Les photos ne bougent pas. Pour voir les dessins animés : Réglages parents (maintenir l’engrenage) > Style des images > Dessins.')); return; }
  v.append(gridOf(list));
}

/* ------------------------------------------------------------------ ma journée (préparée par un parent) */
const DAY_OPTS = [   // [carte, présent (aujourd'hui / demain), passé (ce que j'ai fait)]
  ['École', 'je vais à l’école', 'je suis allée à l’école'], ['Maison', 'je reste à la maison', 'je suis restée à la maison'],
  ['Parc', 'je vais au parc', 'je suis allée au parc'], ['Piscine', 'je vais à la piscine', 'je suis allée à la piscine'],
  ['Mamie', 'je vais chez mamie', 'je suis allée chez mamie'], ['Papi', 'je vais chez papi', 'je suis allée chez papi'],
  ['Magasin', 'on va au magasin', 'on est allés au magasin'], ['Docteur', 'je vais chez le docteur', 'je suis allée chez le docteur'], ['Orthophoniste', 'je vais chez l’orthophoniste', 'je suis allée chez l’orthophoniste'],
  ['Cantine', 'je mange à la cantine', 'j’ai mangé à la cantine'], ['Manger', 'je mange à la maison', 'j’ai mangé à la maison'],
  ['Jardin', 'je joue dans le jardin', 'j’ai joué dans le jardin'], ['Dehors', 'on sort dehors', 'on est sortis dehors'],
  ['Voiture', 'on part en voiture', 'on est partis en voiture'], ['Bus', 'je prends le bus', 'j’ai pris le bus'], ['Papa', 'papa vient me chercher', 'papa est venu me chercher'],
  ['Maman', 'maman vient me chercher', 'maman est venue me chercher'], ['Copines', 'je vois mes copines', 'j’ai vu mes copines'],
  ['Anniversaire', 'on fête un anniversaire', 'on a fêté un anniversaire'], ['Sport', 'je fais du sport', 'j’ai fait du sport'],
  ['Télé', 'je regarde la télé', 'j’ai regardé la télé'], ['iPad', 'je joue à l’iPad', 'j’ai joué à l’iPad'],
  ['Bain', 'je prends mon bain', 'j’ai pris mon bain'], ['Dormir', 'je vais dormir', 'je suis allée dormir'], ['Me reposer', 'je me repose', 'je me suis reposée']];
// [clé, carte, aujourd'hui, demain, passé]
const DAY_MOMENTS = [['matin', 'Ce matin', 'ce matin,', 'demain matin,', 'ce matin,'], ['midi', 'Manger', 'à midi,', 'demain midi,', 'à midi,'],
  ['aprem', 'Cet après-midi', 'cet après-midi,', 'demain après-midi,', 'cet après-midi,'], ['soir', 'Ce soir', 'ce soir,', 'demain soir,', 'ce soir,']];
const MOMENT_NAME = { matin: 'Le matin', midi: 'À midi', aprem: 'L’après-midi', soir: 'Le soir' };
const JOUR_NOM = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const planOf = d => S.week[((d % 7) + 7) % 7] || {};
const capF = t => t.charAt(0).toUpperCase() + t.slice(1);
function planLine(d, k, mode) {   // mode : 'today' | 'tomorrow' | 'past'
  const m = DAY_MOMENTS.find(x => x[0] === k), o = DAY_OPTS.find(x => x[0] === planOf(d)[k]); if (!o) return '';
  return endP(capF((mode === 'tomorrow' ? m[3] : mode === 'past' ? m[4] : m[2]) + ' ' + (mode === 'past' ? o[2] : o[1])));
}
function planText(d, mode) { return DAY_MOMENTS.map(m => planLine(d, m[0], mode)).filter(Boolean).join(' '); }
const picEl = c => c && c.image ? Object.assign(document.createElement('img'), { src: c.image, alt: '' }) : h('div', 'emo', (c && c.emoji) || '•');
function longBtn(el, fn) {   // appui long (0,8 s) OU 3 touchers rapides — marche aussi sur iPad
  let t = null, taps = 0, tapT = null;
  const fire = () => { el.classList.remove('holding'); taps = 0; fn(); };
  const start = e => { if (e.cancelable) e.preventDefault(); el.classList.add('holding'); clearTimeout(t); t = setTimeout(() => { t = null; fire(); }, 800); };
  const stop = tap => {
    el.classList.remove('holding'); if (!t) return; clearTimeout(t); t = null;
    if (!tap) return; taps++; clearTimeout(tapT); tapT = setTimeout(() => { taps = 0; }, 900);
    if (taps >= 3) fire(); else toast('Parent : appuyer longtemps (ou toucher 3 fois)');
  };
  if ('ontouchstart' in window) {
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); stop(true); }, { passive: false });
    el.addEventListener('touchcancel', () => stop(false));
  } else {
    el.addEventListener('pointerdown', start); el.addEventListener('pointerup', () => stop(true));
    el.addEventListener('pointerleave', () => stop(false)); el.addEventListener('pointercancel', () => stop(false));
  }
  el.addEventListener('contextmenu', e => e.preventDefault());
}
function planBlock(title, d, mode, cls) {
  const box = h('div', 'planBox ' + cls), hd = h('div', 'planHead');
  hd.append(h('h2', '', title)); const filled = DAY_MOMENTS.filter(m => planOf(d)[m[0]]);
  if (filled.length) {
    const r = h('button', 'btn primary', '🔊 Écouter'); r.onclick = () => speak(planText(d, mode), true); hd.append(r);
    const x = h('button', 'btn clearDay', '✕'); x.title = 'Effacer ce jour'; let armed = null;
    x.onclick = () => {
      if (!armed) { x.textContent = '✕ Effacer ?'; x.classList.add('armed'); armed = setTimeout(() => { armed = null; x.textContent = '✕'; x.classList.remove('armed'); }, 3000); return; }
      clearTimeout(armed); S.week[((d % 7) + 7) % 7] = {}; LS.set('ambrine-week', S.week); toast('Effacé'); renderView();
    };
    hd.append(x);
  }
  box.append(hd);
  if (!filled.length) { box.append(h('p', 'hint', 'Rien de prévu pour ' + JOUR_NOM[((d % 7) + 7) % 7] + '.')); return box; }
  filled.forEach(([k, mc]) => {
    const row = h('button', 'dayRow'); row.append(picEl(lookup(mc)), picEl(lookup(planOf(d)[k])), h('span', 'what', planLine(d, k, mode)));
    row.onclick = () => speak(planLine(d, k, mode)); box.append(row);
  });
  return box;
}
function renderDayplan(sec) {
  if (S.dayEdit != null) return renderDayEdit(sec);
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle(sec));
  const today = new Date().getDay();
  // ce que je dis
  const say = h('div', 'flowRoots homeBig');
  const mk = (lab, pic, fn, cls) => { const b = h('button', 'flowBtn big ' + (cls || '')); b.append(picEl(lookup(pic)), h('span', '', lab)); b.onclick = fn; return b; };
  say.append(
    mk('Ce que j’ai fait', 'Hier', () => startFlow('raconte'), 'past'),
    mk('Aujourd’hui, je vais…', 'Aujourd’hui', () => startFlow('ajd')),
    mk('Demain, je vais…', 'Demain', () => startFlow('demain'), 'next'),
    mk('Ma journée d’école', 'École', () => startFlow('ecole')),
    mk('Quel jour ?', 'Aujourd’hui', () => go('jours')));
  v.append(h('h2', '', 'Je raconte'), say);
  // le programme
  const any = DAY_MOMENTS.some(m => planOf(today)[m[0]]);
  if (any) { const p = h('button', 'btn', '🗣️ Raconter ma journée avec le programme'); p.onclick = () => speak(planText(today, 'past'), true); v.append(h('div', 'row flowBar', '')); v.lastChild.append(p); }
  v.append(planBlock('Aujourd’hui (' + JOUR_NOM[today] + ')', today, 'today', 'tod'), planBlock('Demain (' + JOUR_NOM[(today + 1) % 7] + ')', today + 1, 'tomorrow', 'tom'));
  const ed = h('button', 'btn editPlan', '✏️ Préparer la journée (parent : appui long ou 3 touchers)'); longBtn(ed, () => { S.dayEdit = today; renderView(); }); v.append(ed);
}
function renderDayEdit(sec) {
  const v = $('#view-cards'); v.replaceChildren(); v.append(viewTitle({ ...sec, label: 'Préparer la journée' }));
  const d = S.dayEdit, bar = h('div', 'row flowBar');
  const done = h('button', 'btn primary', '✅ Terminé'); done.onclick = () => { S.dayEdit = null; renderView(); }; bar.append(done);
  const copy = h('button', 'btn', '📋 Copier sur les autres jours d’école'); copy.onclick = () => { [1, 2, 4, 5].forEach(x => { if (x !== d) S.week[x] = { ...S.week[d] }; }); LS.set('ambrine-week', S.week); toast('Copié sur lundi, mardi, jeudi, vendredi'); };
  const clr = h('button', 'btn', '🗑️ Vider ce jour'); clr.onclick = () => { S.week[d] = {}; LS.set('ambrine-week', S.week); renderView(); };
  bar.append(copy, clr); v.append(bar);
  const days = h('div', 'row dayChips');
  [1, 2, 3, 4, 5, 6, 0].forEach(x => { const b = h('button', 'chip' + (x === d ? ' on' : '') + (x === new Date().getDay() ? ' today' : ''), capF(JOUR_NOM[x])); b.onclick = () => { S.dayEdit = x; renderView(); }; days.append(b); });
  v.append(days);
  DAY_MOMENTS.forEach(([k, mc]) => {
    const box = h('div', 'planBox'); const hd = h('div', 'planHead'); hd.append(picEl(lookup(mc)), h('h2', '', MOMENT_NAME[k])); box.append(hd);
    const strip = h('div', 'optStrip');
    const none = h('button', 'opt' + (!planOf(d)[k] ? ' on' : '')); none.append(h('div', 'emo', '—'), h('span', '', 'Rien')); none.onclick = () => { delete S.week[d][k]; LS.set('ambrine-week', S.week); renderView(); }; strip.append(none);
    DAY_OPTS.forEach(([o]) => { const b = h('button', 'opt' + (planOf(d)[k] === o ? ' on' : '')); b.append(picEl(lookup(o)), h('span', '', o)); b.onclick = () => { S.week[d] = S.week[d] || {}; S.week[d][k] = o; LS.set('ambrine-week', S.week); renderView(); }; strip.append(b); });
    box.append(strip); v.append(box);
  });
}
function renderView() {
  const sec = SEC[S.view];
  $$('.view').forEach(x => x.classList.add('hidden'));
  if (sec.id === 'home') { renderHome(); $('#view-home').classList.remove('hidden'); }
  else {
    $('#view-cards').classList.remove('hidden');
    if (sec.type === 'dayplan') renderDayplan(sec); else if (sec.type === 'phrases') renderPhrases(); else if (sec.type === 'days') renderDays(sec); else if (sec.type === 'anims') renderAnims(sec);
    else if (sec.groups) renderCards(sec); else if (sec.type === 'family') renderFamily(sec); else if (sec.type === 'favs') renderFavs();
    else if (sec.type === 'story') renderStory(); else if (sec.type === 'signs') renderSigns();
  }
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.id === (S.view === 'phrases' ? 'home' : S.view)));
  $('#nav').classList.toggle('away', S.view !== 'home');
  $('#main').scrollTop = 0;
}
function go(id) { stopCurrent(); S.starter = null; S.person = null; S.dayEdit = null; if (id !== 'phrases') S.flow = null; S.dateFlow = null; S.view = id; renderView(); }
function buildNav() {
  const n = $('#nav'); n.replaceChildren();
  SECTIONS.filter(s => ['home', 'reglages'].includes(s.id)).forEach(s => {
    const b = h('button'); b.dataset.id = s.id; b.style.setProperty('--navc', s.color); b.append(h('span', 'ico', s.ico), h('span', '', s.label)); b.setAttribute('aria-label', s.label);
    if (s.id === 'reglages') {          // accès parents : maintenir appuyé
      let t = null; const start = e => { e.preventDefault(); toast('Maintenir appuyé…'); t = setTimeout(() => { t = null; openParent(); }, 1200); }; const end = () => { if (t) { clearTimeout(t); t = null; } };
      b.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, end));
      b.addEventListener('keydown', e => { if (e.key === 'Enter' && e.shiftKey) openParent(); });
    } else b.onclick = () => go(s.id);
    n.append(b);
  });
}

/* ------------------------------------------------------------------ signes LSF */
function openSign(id, title) {
  const s = S.signs.find(x => x.id === id); if (!s) return;
  stopCurrent(); try { speechSynthesis.cancel(); } catch (e) { }
  $('#signTitle').textContent = '🖐 ' + (title || s.label) + (title && title !== s.label ? ' — signe « ' + s.label + ' »' : '');
  $('#signNote').textContent = 'Vidéo de référence : ' + s.source + '. Ce n’est pas une animation du personnage. Lien pictogramme ↔ signe à valider par l’orthophoniste.';
  const v = $('#signVideo'); v.src = s.video; v.playbackRate = 1; v.load(); $('#slowSign').textContent = '🐢 Ralenti';
  $('#signDialog').showModal(); v.play().catch(() => { });
}
function closeSign() { const v = $('#signVideo'); v.pause(); $('#signDialog').close(); }

/* ------------------------------------------------------------------ réglages parents */
const seg = (opts, cur, fn) => { const d = h('div', 'seg'); opts.forEach(([val, txt]) => { const b = h('button', cur === val ? 'on' : '', txt); b.onclick = () => { fn(val); [...d.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); }; d.append(b); }); return d; };
function chk(label, val, fn) { const l = h('label', 'row'); const i = document.createElement('input'); i.type = 'checkbox'; i.checked = val; i.style.cssText = 'width:26px;height:26px'; i.onchange = () => fn(i.checked); l.append(i, document.createTextNode(' ' + label)); return l; }
function openParent() {
  const b = $('#parentBody'); b.replaceChildren();
  { const c = h('div', 'card'); c.append(h('h3', '', 'Tous les classeurs (pour les adultes)'));
    const r = h('div', 'row'); SECTIONS.filter(x => !x.hidden && !['home', 'reglages'].includes(x.id)).forEach(x => { const bt = h('button', 'btn', x.ico + ' ' + x.label); bt.onclick = () => { $('#parentDialog').close(); go(x.id); }; r.append(bt); }); c.append(r); b.append(c); }
  // animations
  let c = h('div', 'card'); c.append(h('h3', '', 'Animations'));
  c.append(seg([['touch', 'A · Au toucher (par défaut)'], ['loop', 'B · Douce, en boucle'], ['off', 'Désactivées']], S.set.animMode, v => { S.set.animMode = v; saveSet(); applyAmbient(); renderView(); }));
  c.append(h('p', 'note', 'A : l’image reste fixe, l’animation (3 à 6 s) démarre quand on touche, puis revient à l’image lisible. B : en plus, une seule carte à la fois bouge très doucement. Tous les dessins (88) ont une animation articulée.'));
  c.append(h('p', reduceQuery.matches ? 'warn' : 'note', reduceQuery.matches ? 'L’appareil demande de réduire les animations : elles sont coupées.' : 'L’appareil ne demande pas de réduire les animations.'));
  c.append(chk('Animer quand même si l’appareil demande de réduire les animations', S.set.forceAnim, v => { S.set.forceAnim = v; saveSet(); renderView(); }));
  b.append(c);
  c = h('div', 'card'); c.append(h('h3', '', 'Taille des images'));
  c.append(seg([['normale', 'Normale'], ['grande', 'Grande'], ['tres', 'Très grande']], S.set.tileSize || 'grande', v => { S.set.tileSize = v; saveSet(); applyLayout(); }));
  c.append(seg([['on', '🔊 Bruit « clac » du puzzle'], ['off', 'Sans bruit']], S.set.sound === false ? 'off' : 'on', v => { S.set.sound = v === 'on'; saveSet(); if (S.set.sound) playSnap(); }));
  b.append(c);
  c = h('div', 'card'); c.append(h('h3', '', 'Quand on touche une image'));
  c.append(seg([['phrase', 'Proposer des phrases avec ce mot'], ['mot', 'Dire seulement le mot']], S.set.wordMode || 'phrase', v => { S.set.wordMode = v; saveSet(); }));
  b.append(c);
  c = h('div', 'card'); c.append(h('h3', '', 'Style des images'));
  c.append(seg([['photo', 'Photos (plus concrètes)'], ['dessin', 'Dessins (avec animations)']], S.set.imgStyle || 'photo', v => { S.set.imgStyle = v; saveSet(); S.cards.forEach(x => { if (v === 'dessin' && x.drawing) { x.image = x.drawing; x.anim = x.animD; } else if (x.photo) { x.image = x.photo; x.anim = undefined; } }); renderView(); }));
  c.append(h('p', 'note', 'Photos : pas d’animation articulée. Dessins : les 88 animations reviennent. Les deux sont gardés dans l’application.'));
  b.append(c);
  c = h('div', 'card'); c.append(h('h3', '', 'Ma journée (programme)'));
  const pj = h('button', 'btn primary', '✏️ Préparer la journée'); pj.onclick = () => { $('#parentDialog').close(); go('journee'); S.dayEdit = new Date().getDay(); renderView(); };
  c.append(pj, h('p', 'note', 'Un programme par jour de la semaine (matin, midi, après-midi, soir). Ambrine le voit dans « Ma journée ».'));
  b.append(c);
  c = h('div', 'card'); c.append(h('h3', '', 'Bande de phrase'));
  c.append(seg([['bottom', 'En bas (on tire les images vers le bas)'], ['top', 'En haut']], S.set.stripPos, v => { S.set.stripPos = v; saveSet(); applyStripPos(); }));
  c.append(h('p', 'note', 'Sur une image : appuyer un instant puis tirer jusqu’à la bande pour l’ajouter. Toucher simple = ajouter aussi.'));
  b.append(c);
  // voix
  c = h('div', 'card'); c.append(h('h3', '', 'Voix'));
  const st = voiceStatus(); c.append(h('div', st.level === 'ok' ? 'ok' : 'warn', st.text));
  const r1 = h('div', 'row'); const sel = h('select'); sel.setAttribute('aria-label', 'Voix');
  const vs = frVoices(); sel.append(new Option(vs.length ? 'Voix automatique' : 'Aucune voix française', ''));
  sel.append(new Option('Automatique (la meilleure)', '')); vs.slice().sort((a, b) => voiceScore(b) - voiceScore(a)).forEach(v => sel.append(new Option(v.name + (BAD_VOICE.test(v.name) ? ' (déconseillée)' : '') + (v.localService ? ' (hors ligne)' : ' (en ligne)'), v.voiceURI))); sel.value = S.set.voiceURI;
  sel.onchange = () => { S.set.voiceURI = sel.value; saveSet(); speak('Bonjour, je suis Ambrine.'); }; r1.append(sel);
  const tv = h('button', 'btn', '🔊 Tester la voix'); tv.onclick = () => speak('Bonjour, je suis Ambrine. Je veux aller au parc.'); r1.append(tv); c.append(r1);
  const r2 = h('div', 'row'); r2.append(h('label', '', 'Vitesse')); const rg = document.createElement('input'); rg.type = 'range'; rg.min = .5; rg.max = 1.3; rg.step = .05; rg.value = S.set.rate; rg.oninput = () => { S.set.rate = +rg.value; saveSet(); }; r2.append(rg);
  const test = h('button', 'btn', '🔊 Tester la voix'); test.onclick = () => speak('Bonjour Ambrine, je veux boire.', true); r2.append(test); c.append(r2);
  b.append(c);
  // affichage
  c = h('div', 'card'); c.append(h('h3', '', 'Comportement'));
  c.append(chk('Dire le mot à voix haute à chaque touche', S.set.speakOnTap, v => { S.set.speakOnTap = v; saveSet(); }));
  c.append(chk('Afficher le bouton 🖐 signe LSF sur les cartes concernées', S.set.showLsf, v => { S.set.showLsf = v; saveSet(); renderView(); }));
  c.append(h('p', 'note', 'Les cartes et leur emplacement ne changent jamais d’eux-mêmes : ordre fixe.'));
  b.append(c);
  // renommer
  c = h('div', 'card'); c.append(h('h3', '', 'Renommer un pictogramme'));
  const ls = h('select'); ls.setAttribute('aria-label', 'Pictogramme'); S.cards.forEach(k => ls.append(new Option(String(k.id).padStart(2, '0') + ' · ' + nameOf(k), k.id)));
  const inp = h('input'); inp.type = 'text'; inp.value = nameOf(S.cards[0]); ls.onchange = () => inp.value = nameOf(cardById(ls.value));
  const sv = h('button', 'btn primary', 'Enregistrer'); sv.onclick = () => { const t = inp.value.trim(); if (!t) return; S.names[ls.value] = t; LS.set('ambrine-labels', S.names); toast('Nom enregistré'); renderView(); };
  const rs = h('button', 'btn', 'Tout restaurer'); rs.onclick = () => { if (confirm('Restaurer tous les noms d’origine ?')) { S.names = {}; LS.set('ambrine-labels', {}); renderView(); openParent(); } };
  const r = h('div', 'row'); r.append(ls, inp, sv, rs); c.append(r); b.append(c);
  // famille
  c = h('div', 'card'); c.append(h('h3', '', 'Ma famille — ajouter une photo'));
  c.append(h('p', 'note', 'Photo + prénom (maman, papa, mamie…). Elle apparaît dans « Ma famille ». Les photos restent sur cet appareil.'));
  const fn = h('input'); fn.type = 'text'; fn.placeholder = 'Prénom ou mot (ex. Maman)'; const ff = h('input'); ff.type = 'file'; ff.accept = 'image/*';
  const fa = h('button', 'btn primary', 'Ajouter'); fa.onclick = () => addFamily(fn.value.trim(), ff.files[0]);
  const fr = h('div', 'row'); fr.append(fn, ff, fa); c.append(fr);
  const fg = h('div', 'fam'); S.family.forEach((f, i) => { const d = h('div'); const im = document.createElement('img'); im.src = f.image; const x = h('button', '', '✕'); x.onclick = () => { S.family.splice(i, 1); LS.set('ambrine-family', S.family); openParent(); renderView(); }; d.append(im, h('div', '', f.label), x); fg.append(d); });
  c.append(fg); b.append(c);
  // hors ligne
  c = h('div', 'card'); c.append(h('h3', '', 'Hors ligne'));
  c.append(h('p', 'note', 'L’application, tous les pictogrammes et les 88 animations sont gardés automatiquement. Les 225 vidéos de signes (≈ 40 Mo) peuvent être téléchargées une fois, en Wi-Fi.'));
  const pg = h('div', 'note', ''); const dl = h('button', 'btn primary', '⬇ Télécharger les vidéos de signes');
  dl.onclick = () => downloadVideos(dl, pg); c.append(dl, pg); b.append(c);
  // à propos
  c = h('div', 'card'); c.append(h('h3', '', 'À savoir'));
  c.append(h('p', 'note', 'Version 48 · 88 pictogrammes + cartes mot/emoji · phrases guidées · 88 animations articulées (le reste : appui avec retour visuel, sans animation). Les vidéos Elix et AutiSignes sont des références de signes : le lien avec chaque pictogramme a été fait d’après le titre et doit être vérifié par l’orthophoniste. Usage privé familial.'));
  const wipe = h('button', 'btn', '🗑 Effacer favoris, phrases et réglages'); wipe.onclick = () => { if (confirm('Tout effacer sur cet appareil (hors photos de famille) ?')) { ['ambrine-favs', 'ambrine-labels', 'ambrine-story', 'ambrine-settings'].forEach(k => localStorage.removeItem(k)); location.reload(); } };
  c.append(wipe); b.append(c);
  if (!$('#parentDialog').open) $('#parentDialog').showModal();
}
function addFamily(label, file) {
  if (!label || !file) { toast('Il faut un prénom et une photo'); return; }
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const m = 360, k = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
    S.family.push({ id: 'f' + Date.now(), label, image: cv.toDataURL('image/jpeg', .82) }); LS.set('ambrine-family', S.family); toast(label + ' ajouté'); openParent(); renderView();
  };
  img.onerror = () => toast('Photo illisible'); img.src = url;
}
async function downloadVideos(btn, out) {
  if (!('caches' in window)) { out.textContent = 'Non disponible sur ce navigateur.'; return; }
  btn.disabled = true; const cache = await caches.open('ambrine-signes-v1'); let done = 0, fail = 0;
  for (const s of S.signs) {
    try { if (!(await cache.match(s.video))) { const r = await fetch(s.video); if (!r.ok) throw 0; await cache.put(s.video, r); } } catch (e) { fail++; }
    done++; out.textContent = done + ' / ' + S.signs.length + (fail ? ' · ' + fail + ' échec(s)' : '');
  }
  out.textContent = fail ? 'Terminé avec ' + fail + ' échec(s). Relancer en cas de coupure.' : 'Terminé : toutes les vidéos sont disponibles hors ligne.'; btn.disabled = false;
}

/* ------------------------------------------------------------------ mode B : animation douce en boucle (une carte à la fois) */
let ambientTimer = 0;
function applyLayout() {
  const b = document.body; ['sz-normale', 'sz-grande', 'sz-tres'].forEach(c => b.classList.remove(c));
  b.classList.add('sz-' + (S.set.tileSize || 'grande')); b.classList.toggle('immersive', !!S.set.immersive);
  const f = $('#fsBtn'); if (f) { f.textContent = S.set.immersive ? '✕' : '⛶'; f.setAttribute('aria-label', S.set.immersive ? 'Quitter le plein écran' : 'Plein écran'); }
}
function toggleFull() {
  S.set.immersive = !S.set.immersive; saveSet(); applyLayout(); drawStrip();
  try {
    const d = document, el = d.documentElement;
    if (S.set.immersive) { (el.requestFullscreen || el.webkitRequestFullscreen || (() => { })).call(el); }
    else if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  } catch (e) { }
}
function applyStripPos() { document.body.classList.toggle('stripTop', S.set.stripPos === 'top'); }
function applyAmbient() {
  clearTimeout(ambientTimer); if (S.set.animMode !== 'loop' || !animAllowed()) return;
  const tick = async () => {
    const dialogOpen = $$('dialog').some(d => d.open);
    if (!document.hidden && !dialogOpen && !S.current) {
      const main = $('#main').getBoundingClientRect();
      const vis = $$('#main .piece').filter(el => { const r = el.getBoundingClientRect(); return el.querySelector('canvas') && r.top >= main.top && r.bottom <= main.bottom; });
      if (vis.length) { const el = vis[Math.floor(Math.random() * vis.length)]; const c = cardById(el.dataset.id); if (c) await playTile(el, c, { amp: 0.35 }); }
    }
    ambientTimer = setTimeout(tick, 5500);
  };
  ambientTimer = setTimeout(tick, 2500);
}

/* ------------------------------------------------------------------ divers */
let toastT = 0;
function toast(t) {
  let e = $('#toast'); if (!e) { e = h('div'); e.id = 'toast'; e.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#2b2140;color:#fff;padding:10px 18px;border-radius:14px;z-index:99;font-weight:700;max-width:90vw'; document.body.append(e); }
  e.textContent = t; e.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => e.style.display = 'none', 1600);
}
function bind() {
  $('#btnSpeak').onclick = () => { if (!S.words.length) { toast('Choisis d’abord des images'); return; } sayStrip(true); };
  $('#btnReplay').onclick = () => { if (S.words.length) sayStrip(true); else if (S.lastSpeech) speak(S.lastSpeech, true); };
  $('#btnBack').onclick = () => { S.words.pop(); drawStrip(); };
  $('#btnClear').onclick = () => { S.words = []; drawStrip(); };
  $('#voiceWarn').onclick = () => { S.voiceWarnClosed = true; updateVoiceWarn(); };
  $('#closeSign').onclick = $('#closeSign2').onclick = closeSign; $('#signDialog').addEventListener('close', () => $('#signVideo').pause());
  $('#replaySign').onclick = () => { const v = $('#signVideo'); v.currentTime = 0; v.play(); };
  $('#slowSign').onclick = () => { const v = $('#signVideo'); v.playbackRate = v.playbackRate === .5 ? 1 : .5; $('#slowSign').textContent = v.playbackRate === .5 ? '🐢 Vitesse normale' : '🐢 Ralenti'; };
  $('#closeParent').onclick = () => $('#parentDialog').close(); $('#closeBig').onclick = () => $('#bigText').close();
  reduceQuery.addEventListener?.('change', () => { stopCurrent(); renderView(); applyAmbient(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCurrent(); });
}
async function init() {
  const [cards, signs, ai] = await Promise.all([fetch('assets/cards.json').then(r => r.json()), fetch('assets/signs.json').then(r => r.json()), fetch('assets/anim/index.json').then(r => r.json()).catch(() => ({}))]);
  cards.forEach(c => { c.photo = c.style === 'photo' ? c.image : null; if (S.set.imgStyle === 'dessin' && c.drawing) { c.image = c.drawing; c.anim = c.animD; } });
  S.cards = cards; S.signs = signs; S.animIndex = ai;
  if (!S.week) { S.week = {}; for (let d = 0; d < 7; d++) S.week[d] = {}; const old = LS.get('ambrine-day', null); if (old) S.week[new Date().getDay()] = old; }
  if (!LS.get('ambrine-ortho-v1', null)) { [1, 3].forEach(d => { S.week[d] = S.week[d] || {}; S.week[d].matin = 'Orthophoniste'; }); LS.set('ambrine-week', S.week); LS.set('ambrine-ortho-v1', 1); }   // orthophoniste : lundi et mercredi matin
  S.flows = buildFlows(lookup); if (S.flows.miss.length) console.warn('cartes manquantes', S.flows.miss);
  const fs = h('button', '', '⛶'); fs.id = 'fsBtn'; fs.onclick = toggleFull; document.body.append(fs);
  const hb = h('button', '', '🏠'); hb.id = 'fsHome'; hb.setAttribute('aria-label', 'Accueil'); hb.onclick = () => go('home'); document.body.append(hb);
  const band = h('div', ''); band.id = 'band'; const strip = $('#strip'); strip.insertBefore(band, $('#tokens')); band.append($('#tokens'), $('#stripBtns'));
  applyLayout(); applyStripPos(); buildNav(); bind(); drawStrip(); renderView(); applyAmbient();
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; setTimeout(loadVoices, 600); } else updateVoiceWarn();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
}
init().catch(e => { document.body.innerHTML = '<p style="padding:20px;font:18px system-ui">Impossible de charger l’application. Ouvrez-la depuis Netlify ou un petit serveur (pas en double-cliquant sur le fichier).<br><small>' + e + '</small></p>'; console.error(e); });
