/* PC Lab v2 — application élève (flashcards à répétition espacée) */
'use strict';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const APP = document.getElementById('app');
const DEVISE = 'À force de forger on devient forgeron';
const JOURS = [1, 3, 7, 15, 30];
const MAX_RETARD = 15, SERIE = 20, SERIE_EXAMEN = 15, RETOUR_NON = [4, 5], RETOUR_MOITIE = 8;
const melanger = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const S = {
  apercu: false,      // compte professeur : rien n'est enregistré
  eleve: null, ouverts: [], idx: null, parts: {}, suivi: {}, theme: 'ocean',
  session: null, examenSel: null, consult: null, progOpen: {},
};

/* ---------- mode clair / sombre ---------- */
const MQ = window.matchMedia('(prefers-color-scheme: dark)');
const modeChoisi = () => localStorage.getItem('pclab_mode') || 'auto';
function appliquerMode() {
  const m = modeChoisi(), sombre = m === 'sombre' || (m === 'auto' && MQ.matches);
  document.documentElement.dataset.mode = sombre ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', sombre ? '#0F141E' : '#0A2E6E');
}
appliquerMode();
MQ.addEventListener?.('change', appliquerMode);

/* ---------- utilitaires ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auj = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const ICON = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C8597" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  go: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  cards: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg>',
  book: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h6"/></svg>',
  cal: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  qcm: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>',
  ok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>',
  search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7487" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
};
const BADGE = '<div class="badge" aria-label="PC Lab, par M. Hmimou"><b><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 14h9" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>PC Lab</b><small>by M. Hmimou</small></div>';
const head = (back, backLabel, title, sub) => `<div class="top"><div class="top-row"><a class="back" href="${back}">${ICON.back}${esc(backLabel)}</a>${BADGE}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`;
const nav = on => `<nav class="tabs" aria-label="Navigation">
<a href="#/accueil" class="${on === 'accueil' ? 'on' : ''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>Accueil</a>
<a href="#/progression" class="${on === 'progression' ? 'on' : ''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-5"/></svg>Progression</a>
<a href="#/profil" class="${on === 'profil' ? 'on' : ''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>Profil</a></nav>`;
const page = (html, tab) => { document.getElementById('tour')?.remove(); APP.classList.remove('large'); APP.innerHTML = (S.apercu ? '<div class="preview">Mode aperçu professeur : ta progression de test est gardée dans ce navigateur seulement.</div>' : '') + (S.baseKO ? '<div class="preview" style="background:#FBE4DF;color:#7A2414">La base de données n\'est pas prête : ta progression ne sera pas enregistrée. Préviens ton professeur.</div>' : '') + `<div class="scroll">${html}</div>` + (tab === false ? '' : nav(tab)); window.scrollTo(0, 0); };
const surPlace = f => { const y = window.scrollY; f(); window.scrollTo(0, y); };
const big = (cls, href, icon, title, sub, extra = '') => `<a class="big ${cls} mx" href="${href}" ${extra}><span class="row"><span class="ic">${icon}</span><span class="t">${title}</span><span class="go">${ICON.go}</span></span>${sub ? `<span class="s">${sub}</span>` : ''}</a>`;

/* ---------- contenu ---------- */
const chapitres = () => S.idx.chapitres.filter(c => S.apercu || S.ouverts.includes(c.num));
const chap = n => S.idx.chapitres.find(c => c.num === +n);
const partInfo = slug => { for (const c of S.idx.chapitres) for (const p of c.parties) if (p.slug === slug) return { c, p }; return null; };
async function loadPart(slug) {
  if (!S.parts[slug]) {
    const r = await fetch(`contenu/${slug}.json`);
    S.parts[slug] = (await r.json()).cartes.map(x => ({ ...x, slug }));
  }
  return S.parts[slug];
}
const loadChap = async n => (await Promise.all(chap(n).parties.map(p => loadPart(p.slug)))).flat();
const loadAll = async () => (await Promise.all(chapitres().map(c => loadChap(c.num)))).flat();

/* ---------- état d'une carte ---------- */
function etat(id) {
  const s = S.suivi[id];
  if (!s) return 'nouvelle';
  if (s.a_consolider || s.boite <= 1) return 'consolider';
  return s.boite >= 4 ? 'acquise' : 'encours';
}
const aRevoir = id => { const s = S.suivi[id]; return !!s && s.prochaine <= auj(); };
const fragilite = id => { const s = S.suivi[id]; if (!s) return 2; return (s.a_consolider ? 0 : 1) * 10 + s.boite; };
const parFragilite = cs => cs.slice().sort((a, b) => fragilite(a.id) - fragilite(b.id) || (S.suivi[a.id]?.prochaine || '').localeCompare(S.suivi[b.id]?.prochaine || ''));
/* Étapes affichées à l'élève : Découverte → En cours → Bien retenue → Maîtrisée */
function etape(id) {
  const s = S.suivi[id];
  if (!s) return 'nouvelle';
  if (s.a_consolider || s.boite <= 1) return 'decouverte';
  return s.boite === 2 ? 'cours' : s.boite === 3 ? 'retenue' : 'maitrisee';
}
const ETAPES = [['maitrisee', 'maîtrisée', 'maîtrisées', 100], ['retenue', 'bien retenue', 'bien retenues', 72], ['cours', 'en cours', 'en cours', 48], ['decouverte', 'découverte', 'découvertes', 26]];
const coulEtape = k => `color-mix(in srgb, var(--ch) ${ETAPES.find(e => e[0] === k)[3]}%, var(--card))`;
function compte(ids) {
  const r = { acquise: 0, encours: 0, consolider: 0, nouvelle: 0, due: 0, decouverte: 0, cours: 0, retenue: 0, maitrisee: 0 };
  ids.forEach(id => { r[etat(id)]++; const e = etape(id); if (e !== 'nouvelle') r[e]++; if (aRevoir(id)) r.due++; });
  return r;
}
const resume = r => ETAPES.filter(([k]) => r[k]).map(([k, s1, pl]) => `${r[k]} ${r[k] > 1 ? pl : s1}`).join(' · ');
const idsPart = p => Array.from({ length: p.n }, (_, i) => `${p.slug}-${String(i + 1).padStart(2, '0')}`);
const idsChap = c => c.parties.flatMap(idsPart);
const barre = (r, n, h = 6) => {
  const seg = (k, col) => r[k] ? `<span style="width:${(100 * r[k] / n).toFixed(1)}%;background:${col}"></span>` : '';
  return `<span class="bar" style="height:${h}px">${ETAPES.map(([k]) => seg(k, coulEtape(k))).join('')}</span>`;
};

/* ---------- enregistrement d'une réponse ---------- */
/* ---------- séries, mélange, alternance ---------- */
function tailles(n) { const k = n <= 15 ? 1 : n <= 30 ? 2 : Math.max(3, Math.ceil(n / 15)), b = Math.floor(n / k); return Array.from({ length: k }, (_, i) => b + (i < n % k ? 1 : 0)); }
function melangerSansPaire(ids, paires) {
  const g = id => paires ? Math.ceil(+id.match(/(\d+)$/)[1] / 2) : id;
  let a = melanger(ids);
  for (let essai = 0; essai < 50; essai++) {
    let ok = true;
    for (let i = 1; i < a.length; i++) if (g(a[i]) === g(a[i - 1])) { ok = false; const j = i + 1 + Math.floor(Math.random() * (a.length - i - 1)); if (j < a.length) [a[i], a[j]] = [a[j], a[i]]; else a = melanger(a); }
    if (ok) break;
  }
  return a;
}
function seriesPartie(p) {
  const cle = 'pclab_series_' + p.slug, ids = idsPart(p);
  let st = null; try { st = JSON.parse(localStorage.getItem(cle)); } catch (e) { }
  if (!st || !Array.isArray(st.ordre) || st.ordre.length !== ids.length || ids.some(i => !st.ordre.includes(i))) {
    st = { ordre: p.melange ? melangerSansPaire(ids, p.paires) : ids, k: 0 };
    localStorage.setItem(cle, JSON.stringify(st));
  }
  const t = tailles(ids.length), k = Math.min(st.k, t.length - 1), debut = t.slice(0, k).reduce((a, b) => a + b, 0);
  return { cle, st, k, nb: t.length, ids: st.ordre.slice(debut, debut + t[k]) };
}
const chapNumDe = c => { const i = partInfo(c.slug); return i ? i.c.num : 0; };
function entrelacer(cards) {
  const groupes = new Map(); cards.forEach(c => { const n = chapNumDe(c); if (!groupes.has(n)) groupes.set(n, []); groupes.get(n).push(c); });
  const res = []; let dernier = null;
  while (res.length < cards.length) {
    const dispo = [...groupes.entries()].filter(([n, l]) => l.length && n !== dernier).sort((a, b) => b[1].length - a[1].length);
    const [n, l] = dispo.length ? dispo[0] : [...groupes.entries()].find(([, l]) => l.length);
    res.push(l.shift()); dernier = n;
  }
  return res;
}

function regleLocale(id, rep) {
  const s = S.suivi[id] || { carte_id: id, boite: 1, a_consolider: false, prochaine: auj(), nb_reponses: 0 };
  const due = !s.nb_reponses || s.prochaine <= auj();
  if (rep === 2) { if (due) { s.boite = Math.min(s.boite + 1, 5); s.a_consolider = false; s.prochaine = addDays(auj(), JOURS[s.boite - 1]); } }
  else if (rep === 1) s.prochaine = addDays(auj(), 1);
  else { s.boite = Math.max(s.boite - 1, 1); s.a_consolider = true; s.prochaine = addDays(auj(), 1); }
  s.nb_reponses++; S.suivi[id] = s;
}
async function enregistrer(id, rep) {
  regleLocale(id, rep); // affichage immédiat
  if (S.apercu) { localStorage.setItem('pclab_apercu_suivi', JSON.stringify(S.suivi)); return; }
  try {
    const { data, error } = await sb.rpc('repondre_carte', { p_carte_id: id, p_reponse: rep });
    if (error) throw error;
    if (data) S.suivi[id] = data;
  } catch (e) { console.warn('Réponse non enregistrée', e); alerteSauvegarde(); }
}

function alerteSauvegarde() {
  if (document.getElementById('alerte')) return;
  const d = document.createElement('div'); d.id = 'alerte';
  d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:84px;z-index:60;max-width:456px;margin:0 auto;background:#FBE4DF;color:#7A2414;border-radius:12px;padding:12px 14px;font-size:14px;box-shadow:0 6px 18px rgba(0,0,0,.2)';
  d.innerHTML = '<b>Ta réponse n\'a pas pu être enregistrée.</b> Vérifie ta connexion Internet. Si cela continue, préviens ton professeur.';
  document.body.appendChild(d); setTimeout(() => d.remove(), 6000);
}

/* ---------- routes ---------- */
const ROUTES = {
  accueil: vAccueil, chapitres: vChapitres, chapitre: vChapitre, partie: vPartie, complet: vComplet,
  cartes: vCartes, consulter: vConsulter, revisions: vRevisions, examen: vExamen, progression: vProgression, profil: vProfil,
  aide: () => vAide(false), bienvenue: revoirExplications,
};
async function route() {
  if (!S.idx) return;
  const [name, ...args] = (location.hash.replace(/^#\/?/, '') || 'accueil').split('/');
  const f = ROUTES[name] || vAccueil;
  try { await f(...args.map(decodeURIComponent)); } catch (e) { console.error(e); page(`<p class="note" style="margin-top:40px">Un problème est survenu. <a href="#/accueil">Retour à l'accueil</a></p>`); }
}
window.addEventListener('hashchange', route);

/* ---------- écrans ---------- */
function chapCourant() {
  const ch = chapitres(); if (!ch.length) return null;
  const saved = +localStorage.getItem('pclab_chap');
  return ch.find(c => c.num === saved) || ch[ch.length - 1];
}
async function vAccueil() {
  const c = chapCourant();
  let due = 0; chapitres().forEach(x => idsChap(x).forEach(id => { if (aRevoir(id)) due++; }));
  page(`<div class="top home"><div><h1>Bonjour !</h1><p>${DEVISE}</p></div>${BADGE}</div><div style="height:10px"></div>
  ${S.message ? `<div class="panel mx msg-eleve"><b>Message de ton professeur</b><div>${esc(S.message.message).replace(/\n/g, '<br>')}</div><small>${new Date(S.message.message_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</small></div>` : ''}
  ${c ? big('ch compact', `#/chapitre/${c.num}`, ICON.book, 'Travailler un chapitre', `Ch. ${c.num} · ${esc(c.titre)}`, 'data-tour="chap"') : '<p class="note">Ton professeur n\'a pas encore ouvert de chapitre.</p>'}
  ${big('gen compact', '#/revisions', ICON.cal, 'Révisions générales', due ? `${due} carte${due > 1 ? 's' : ''} à revoir aujourd'hui` : 'Rien à revoir aujourd\'hui', 'data-tour="rev"')}`, 'accueil');
  tour('accueil', [
    { sel: '[data-tour="chap"]', text: 'Travaille le chapitre vu en classe, <b>partie par partie</b>.' },
    { sel: '[data-tour="rev"]', text: 'Chaque jour, tes <b>cartes à revoir</b> t\'attendent ici.' },
    { sel: 'nav.tabs a[href="#/progression"]', text: 'Ta <b>progression</b>, carte par carte.' },
    { sel: 'nav.tabs a[href="#/profil"]', text: 'Couleurs et <b>installation</b> sur ton téléphone.' },
  ]);
}
function vChapitres() {
  const cur = chapCourant();
  const items = chapitres().map(c => {
    const n = idsChap(c).length;
    return `<a class="item mx ${cur && cur.num === c.num ? 'cur' : ''}" href="#/chapitre/${c.num}" data-chap="${c.num}"><span class="num">Ch.&#160;${c.num}</span><span class="body"><span class="tt">${esc(c.titre)}</span><span class="meta">${n} cartes</span></span>${ICON.chev}</a>`;
  }).join('');
  page(head('#/accueil', 'Accueil', 'Choisir un chapitre') + `<p class="label">Chapitres vus en classe</p>${items || '<p class="note">Aucun chapitre ouvert pour le moment.</p>'}<p class="note">Les chapitres suivants apparaîtront ici dès qu'ils auront été vus en classe.</p>`, 'accueil');
  APP.querySelectorAll('[data-chap]').forEach(a => a.addEventListener('click', () => localStorage.setItem('pclab_chap', a.dataset.chap)));
}
function vChapitre(n) {
  const c = chap(n); if (!c) return vAccueil();
  localStorage.setItem('pclab_chap', c.num);
  const parts = c.parties.map((p, i) => {
    const ids = idsPart(p), r = compte(ids), vues = p.n - r.nouvelle;
    const meta = vues ? `${p.n} cartes · ${resume(r)}` : `${p.n} cartes · pas encore commencé`;
    return `<a class="item mx" href="#/partie/${p.slug}"><span class="num">${i + 1}</span><span class="body"><span class="tt">${esc(p.titre)}</span><span class="meta"><span>${meta}</span>${r.due ? `<span class="due">${r.due} à revoir</span>` : ''}</span>${barre(r, p.n)}</span>${ICON.chev}</a>`;
  }).join('');
  page(`<div class="top" style="padding-bottom:58px"><div class="top-row"><a class="back" href="#/accueil">${ICON.back}Accueil</a>${BADGE}</div><h1>Travailler un chapitre</h1></div>
  <a class="banner" href="#/chapitres"><span class="chn">Ch.&#160;${c.num}</span><span class="txt2"><small>Chapitre travaillé</small><b>${esc(c.titre)}</b></span><span class="pill">Changer</span></a>
  <p class="label">Les parties du chapitre</p>${parts}
  <a class="soft mx" href="#/complet/${c.num}"><span class="ic2" style="color:var(--ch)">${ICON.book}</span><span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:16px">Réviser tout le chapitre</b><small style="font-size:13px;color:var(--dark2)">Toutes les parties mélangées</small></span>${ICON.chev}</a>`, 'accueil');
}
function vPartie(slug) {
  const info = partInfo(slug); if (!info) return vAccueil();
  const { c, p } = info, i = c.parties.indexOf(p) + 1, r = compte(idsPart(p)), vues = p.n - r.nouvelle;
  const sub = (c.parties.length > 1 ? `Partie ${i} / ${c.parties.length} · ` : '') + `Ch. ${c.num} ${esc(c.titre)}`;
  page(head(`#/chapitre/${c.num}`, `Chapitre ${c.num}`, esc(p.titre), sub) + `<div style="height:4px"></div>
  ${(() => { const se = seriesPartie(p); return big('ch compact', `#/cartes/partie/${slug}`, ICON.cards, 'Flashcards', se.nb > 1 ? `${p.n} cartes en ${se.nb} séries · prochaine : série ${se.k + 1} (${se.ids.length} cartes)` : `${p.n} cartes · ${vues ? resume(r) : 'pas encore commencé'}${r.due ? ` · ${r.due} à revoir` : ''}`); })()}
  ${big('mid compact off', '#', ICON.qcm, 'QCM', 'Bientôt disponible')}
  <a class="link-discret" href="#/consulter/${slug}">Consulter les cartes</a>`, 'accueil');
}
function vComplet(n) {
  const c = chap(n); if (!c) return vAccueil();
  const ids = idsChap(c), r = compte(ids), diff = ids.filter(id => etat(id) === 'consolider').length;
  page(head(`#/chapitre/${c.num}`, `Chapitre ${c.num}`, 'Réviser tout le chapitre', `Ch. ${c.num} · toutes les parties mélangées`) + `<div style="height:4px"></div>
  ${big('ch', `#/cartes/chapitre/${c.num}`, ICON.cards, 'Flashcards du chapitre', `${ids.length} cartes, les plus fragiles d'abord, par séries de ${SERIE}`)}
  ${big('mid off', '#', ICON.qcm, 'QCM du chapitre', 'Bientôt disponible')}
  <a class="row-link mx" href="#/cartes/difficiles/${c.num}"><span><b>Revoir mes cartes difficiles</b><small>${diff} carte${diff > 1 ? 's' : ''} à consolider dans ce chapitre</small></span>${ICON.chev}</a>`, 'accueil');
}
async function vRevisions() {
  const all = await loadAll();
  const due = all.filter(x => aRevoir(x.id)), dif = all.filter(x => etat(x.id) === 'consolider').length;
  const retard = due.length > MAX_RETARD, n = Math.min(due.length, MAX_RETARD), min = Math.max(1, Math.round(n * 0.6));
  page(head('#/accueil', 'Accueil', 'Révisions générales', 'Tous les chapitres déjà vus en classe') + `<div style="height:4px"></div>
  ${n ? big('gen', '#/cartes/jour', ICON.cards, 'Mes cartes du jour', `${n} carte${n > 1 ? 's' : ''} · environ ${min} minute${min > 1 ? 's' : ''}`)
      : `<div class="mx" style="background:var(--doneBg);border-radius:18px;padding:20px;display:flex;gap:14px;align-items:center;color:var(--doneTx)"><b style="font-size:18px">Cartes du jour : c'est fait</b></div>`}
  ${retard ? `<p class="note" style="text-align:left;margin:0 20px;color:var(--muted)">Tu as pris un peu de retard, ce n'est pas grave : on te propose ${MAX_RETARD} cartes par jour, les plus fragiles d'abord. Le reste suivra.</p>` : ''}
  <a class="big genmid mx" href="#/examen"><span class="row"><span style="flex:1;display:flex;flex-direction:column;gap:3px"><span style="font-size:17px;font-weight:800">Préparer un examen</span><span style="font-size:14px;color:var(--genText)">Choisis tes chapitres : DS, bac blanc, bac</span></span><span class="go">${ICON.go}</span></span></a>
  <a class="row-link mx" href="#/cartes/difficiles/tous"><span><b>Mes cartes à consolider</b><small>${dif} carte${dif > 1 ? 's' : ''}, tous chapitres</small></span>${ICON.chev}</a>`, 'accueil');
}
function vExamen() {
  const ch = chapitres();
  if (!S.examenSel) S.examenSel = new Set(ch.slice(-3).map(c => c.num));
  const sel = ch.filter(c => S.examenSel.has(c.num)), nb = sel.reduce((s, c) => s + idsChap(c).length, 0);
  const rows = ch.map(c => `<button class="check ${S.examenSel.has(c.num) ? 'on' : ''}" data-tog="${c.num}"><span class="box">${S.examenSel.has(c.num) ? ICON.ok : ''}</span><span style="flex:1;display:flex;flex-direction:column"><b style="font-size:15px">Ch. ${c.num} · ${esc(c.titre)}</b><small style="color:var(--muted)">${idsChap(c).length} cartes</small></span></button>`).join('');
  page(head('#/revisions', 'Révisions générales', 'Préparer un examen', 'DS, bac blanc ou bac') + `
  <div class="mx" style="display:flex;justify-content:space-between;align-items:center"><span class="label" style="margin:0">1. Choisis tes chapitres</span><button class="link-discret" style="text-decoration:none;color:var(--gen);font-weight:700" id="tout">${sel.length === ch.length ? 'Tout décocher' : 'Tout cocher'}</button></div>
  <div class="mx" style="display:flex;flex-direction:column;gap:8px">${rows}</div>
  <span class="label">2. Choisis ton entraînement</span>
  ${sel.length ? big('gen compact', `#/cartes/examen/${sel.map(c => c.num).join(',')}`, ICON.cards, 'Flashcards', `${nb} cartes, les plus fragiles d'abord, par séries de ${SERIE_EXAMEN}, chapitres mélangés`) + big('genmid compact off', '#', ICON.qcm, 'QCM', 'Bientôt disponible')
    : '<p class="note">Coche au moins un chapitre.</p>'}`, 'accueil');
  const garder = f => { const sc = APP.querySelector('.scroll'), y = window.scrollY, ys = sc ? sc.scrollTop : 0; f(); vExamen(); window.scrollTo(0, y); const sc2 = APP.querySelector('.scroll'); if (sc2) sc2.scrollTop = ys; };
  APP.querySelectorAll('[data-tog]').forEach(b => b.addEventListener('click', () => garder(() => { const n = +b.dataset.tog; S.examenSel.has(n) ? S.examenSel.delete(n) : S.examenSel.add(n); })));
  document.getElementById('tout').addEventListener('click', () => garder(() => { S.examenSel = sel.length === ch.length ? new Set() : new Set(ch.map(c => c.num)); }));
}

/* ---------- séance de cartes ---------- */
async function vCartes(kind, arg) {
  let cards = [], title = '', sub = '', back = '#/accueil', backLabel = 'Accueil', color = 'ch';
  if (kind === 'partie') {
    const { c, p } = partInfo(arg), tout = await loadPart(arg), se = seriesPartie(p);
    cards = se.ids.map(id => tout.find(x => x.id === id)).filter(Boolean);
    title = p.titre; sub = se.nb > 1 ? `Série ${se.k + 1} / ${se.nb}` : (c.parties.length > 1 ? `Partie ${c.parties.indexOf(p) + 1} / ${c.parties.length}` : `Ch. ${c.num}`);
    S.serie = { slug: arg, ...se };
    back = `#/partie/${arg}`; backLabel = p.titre;
  } else if (kind === 'chapitre') {
    const c = chap(arg); cards = melanger(parFragilite(await loadChap(c.num)).slice(0, SERIE));
    title = `Tout le chapitre ${c.num}`; sub = 'Parties mélangées'; back = `#/complet/${c.num}`; backLabel = `Chapitre ${c.num}`;
  } else if (kind === 'difficiles') {
    const src = arg === 'tous' ? await loadAll() : await loadChap(arg);
    cards = parFragilite(src.filter(x => etat(x.id) === 'consolider'));
    title = 'Cartes difficiles'; sub = arg === 'tous' ? 'Tous chapitres' : `Ch. ${arg}`;
    back = arg === 'tous' ? '#/revisions' : `#/complet/${arg}`; backLabel = 'Retour'; color = arg === 'tous' ? 'gen' : 'ch';
  } else if (kind === 'jour') {
    cards = entrelacer(parFragilite((await loadAll()).filter(x => aRevoir(x.id))).slice(0, MAX_RETARD));
    title = 'Mes cartes du jour'; sub = 'Tous chapitres'; back = '#/revisions'; backLabel = 'Révisions'; color = 'gen';
  } else if (kind === 'examen') {
    const nums = arg.split(',').map(Number);
    const pool = (await Promise.all(nums.map(loadChap))).flat();
    cards = melanger(parFragilite(pool).slice(0, SERIE_EXAMEN));
    S.examPool = { pool, faites: new Set(cards.map(x => x.id)) };
    title = 'Préparer un examen'; sub = 'Ch. ' + nums.join(', '); back = '#/examen'; backLabel = 'Examen'; color = 'gen';
  }
  if (!cards.length) { page(head(back, backLabel, esc(title)) + '<p class="note" style="margin-top:30px">Aucune carte à revoir ici pour le moment.</p>', 'accueil'); return; }
  S.session = { kind, cards, queue: cards.map((_, i) => i), pos: 0, revealed: false, flipped: false, acquired: 0, retries: 0, seen: new Set(), moitie: new Set(), finies: new Set(), hard: new Set(), title, sub, back, backLabel, color, total: cards.length };
  drawCarte();
}
function drawCarte() {
  const s = S.session, done = s.pos >= s.queue.length;
  const top = `<div class="top" style="gap:10px;padding-bottom:16px"><div class="top-row"><a class="back" href="${s.back}">${ICON.back}${esc(s.backLabel)}</a>${BADGE}</div>
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span style="font-size:20px;font-weight:800">${esc(s.title)}</span><span style="font-size:13px;color:var(--sub)">${esc(s.sub)}</span></div>
  <div class="prog"><span class="bar"><span style="width:${Math.round(100 * s.acquired / s.total)}%"></span></span><b>${s.acquired} / ${s.total}</b></div></div>`;
  if (done) {
    const nh = s.hard.size;
    const ser = s.kind === 'partie' && S.serie && S.serie.nb > 1 ? S.serie : null;
    if (ser && !s.serieFinie) {
      s.serieFinie = true;
      if (ser.k + 1 < ser.nb) { ser.st.k = ser.k + 1; localStorage.setItem(ser.cle, JSON.stringify(ser.st)); }
      else localStorage.removeItem(ser.cle);
    }
    const suite = ser && ser.k + 1 < ser.nb ? tailles(ser.st.ordre.length)[ser.k + 1] : 0;
    page(top + `<div class="done"><span style="width:72px;height:72px;border-radius:999px;background:#DDF1E4;display:flex;align-items:center;justify-content:center"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1D6B3E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg></span>
    <p style="margin:0;font-size:24px;font-weight:800;color:var(--title)">${ser ? `Série ${ser.k + 1} / ${ser.nb} terminée !` : 'Paquet terminé !'}</p><p style="margin:0;font-size:17px;font-weight:700;color:var(--ink)">${s.total - s.hard.size} carte${s.total - s.hard.size > 1 ? 's' : ''} réussie${s.total - s.hard.size > 1 ? 's' : ''} sur ${s.total} !</p><p style="margin:0;font-size:14px;color:var(--muted)">Les cartes ratées reviendront demain.</p>
    ${nh ? `<button class="btn-main ${s.color}" style="width:100%;margin-top:10px" id="hard">Revoir mes ${nh} cartes difficiles</button>` : '<p style="margin:0;font-weight:700;color:#1D6B3E">Aucune carte difficile : bravo !</p>'}
    ${suite ? `<button class="btn-main ch" style="width:100%" id="serieSuiv">Continuer avec la série ${ser.k + 2} (${suite} cartes)</button><a class="link-discret" href="${s.back}" style="text-decoration:none;font-weight:700">M'arrêter là</a>` : ''}
    ${s.kind === 'examen' && S.examPool && S.examPool.pool.some(x => !S.examPool.faites.has(x.id)) ? `<button class="btn-main gen" style="width:100%" id="suivante">Série suivante (${Math.min(SERIE_EXAMEN, S.examPool.pool.filter(x => !S.examPool.faites.has(x.id)).length)} cartes)</button>` : ''}
    <button class="link-discret" style="text-decoration:none;color:var(--${s.color});font-weight:700" id="again">Recommencer ${s.kind === 'examen' || ser ? 'cette série' : 'tout le paquet'}</button></div>`, 'accueil');
    const ss = document.getElementById('serieSuiv');
    if (ss) ss.onclick = () => vCartes('partie', ser.slug);
    const sv = document.getElementById('suivante');
    if (sv) sv.onclick = () => { const reste = S.examPool.pool.filter(x => !S.examPool.faites.has(x.id)); const cs = melanger(parFragilite(reste).slice(0, SERIE_EXAMEN)); cs.forEach(x => S.examPool.faites.add(x.id)); Object.assign(s, { cards: cs, queue: cs.map((_, i) => i), pos: 0, acquired: 0, retries: 0, seen: new Set(), moitie: new Set(), finies: new Set(), hard: new Set(), total: cs.length }); drawCarte(); };
    document.getElementById('again').onclick = () => { Object.assign(s, { queue: s.cards.map((_, i) => i), pos: 0, acquired: 0, retries: 0, seen: new Set(), moitie: new Set(), finies: new Set(), hard: new Set(), total: s.cards.length }); drawCarte(); };
    const h = document.getElementById('hard');
    if (h) h.onclick = () => { const q = [...s.hard].sort((a, b) => a - b); Object.assign(s, { queue: q, pos: 0, acquired: 0, retries: 0, seen: new Set(), moitie: new Set(), finies: new Set(), hard: new Set(), total: q.length }); drawCarte(); };
    return;
  }
  const c = s.cards[s.queue[s.pos]];
  const img = side => c.image && c.image_cote === side ? `<img src="img/${esc(c.image)}" alt="Schéma">` : '';
  const tag = !s.flipped ? (c.type ? `<p class="tag ${c.type === 'SITUATION' ? 'sit' : ''}">${esc(c.type)}</p>` : '<p class="tag">Question</p>') : '<p class="tag rep">Réponse</p>';
  const body = !s.flipped ? `<div class="qtxt">${c.question}</div>${img('q')}` : `<div class="atxt">${c.reponse}</div>${img('a')}`;
  const rate = s.seen.has(s.queue[s.pos]), moitie = !rate && s.moitie.has(s.queue[s.pos]) && s.queue.indexOf(s.queue[s.pos]) < s.pos;
  const revient = rate ? '<span class="revient rate" role="img" aria-label="Carte ratée tout à l\'heure : elle revient" title="Carte ratée tout à l\'heure : elle revient">↻</span>'
    : moitie ? '<span class="revient moitie" role="img" aria-label="Carte connue à moitié : elle revient" title="Carte connue à moitié : elle revient">↻</span>' : '';
  const actions = !s.revealed ? `<button class="btn-main ${s.color}" id="voir">Voir la réponse</button>`
    : `<p class="ask">Tu avais trouvé ?</p><div class="grade"><button class="g0" data-r="0">Non</button><button class="g1" data-r="1">À moitié</button><button class="g2" data-r="2">Oui</button></div>`;
  page(top + `<div class="mx" style="display:flex;flex-direction:column;margin-top:4px"><div class="card" id="carte">${revient}${tag}${body}</div>
  <div style="display:flex;flex-direction:column;gap:10px;padding-top:18px">${actions}</div></div>`, 'accueil');
  const show = () => { s.revealed = true; s.flipped = true; drawCarte(); };
  document.getElementById('carte').onclick = () => { if (!s.revealed) show(); else { s.flipped = !s.flipped; drawCarte(); } };
  const v = document.getElementById('voir'); if (v) v.onclick = show;
  if (!s.revealed && revient && localStorage.getItem('pclab_tour_carte_q')) tour('revient', [{ sel: '.revient', text: '<b>↻</b> Cette carte revient : tu l\'avais <b>ratée</b> (rouge) ou connue <b>à moitié</b> (ambre).' }]);
  else if (!s.revealed) tour('carte_q', [{ sel: '#voir', text: 'Cherche la réponse <b>dans ta tête</b>, puis touche ici.' }]);
  else tour('carte_r', [{ sel: '.grade', text: 'Sois honnête : une carte <b>ratée revient demain</b>, une carte réussie revient plus tard.' }]);
  APP.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
    const rep = +b.dataset.r, i = s.queue[s.pos];
    enregistrer(c.id, rep);
    const remettre = k => { const at = s.pos + 1 + k; at < s.queue.length ? s.queue.splice(at, 0, i) : s.queue.push(i); };
    if (rep === 0) { remettre(RETOUR_NON[Math.floor(Math.random() * RETOUR_NON.length)]); s.seen.add(i); s.retries++; }
    else if (rep === 1 && !s.moitie.has(i)) { s.moitie.add(i); remettre(RETOUR_MOITIE); }
    else s.finies.add(i);
    s.acquired = s.finies.size;
    if (rep < 2) s.hard.add(i);
    s.pos++; s.revealed = false; s.flipped = false; drawCarte();
  });
}

/* ---------- consulter ---------- */
async function vConsulter(slug) {
  const { p } = partInfo(slug), cards = await loadPart(slug);
  if (!S.consult || S.consult.slug !== slug) S.consult = { slug, q: '', open: 0, shown: false };
  const k = S.consult, norm = x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, ' ');
  if (k.open) {
    const c = cards[k.open - 1], img = side => c.image && c.image_cote === side ? `<img src="img/${esc(c.image)}" alt="Schéma" style="width:100%;max-height:220px;object-fit:contain;margin-top:12px">` : '';
    page(`<div class="top"><div class="top-row"><button class="back" id="liste">${ICON.back}Toutes les cartes</button>${BADGE}</div><h1>Consulter les cartes</h1><p>${esc(p.titre)} · ${cards.length} cartes · sans effet sur ta progression</p></div>
    <p class="mx" style="margin-top:2px;margin-bottom:-4px;font-size:14px;font-weight:700;color:var(--ch)">Carte ${k.open} / ${cards.length} · ${esc(c.titre)}</p>
    <div class="panel mx" style="text-align:center"><p class="tag">Question</p><div class="qtxt" style="font-size:17px">${c.question}</div>${img('q')}
    ${k.shown ? `<div style="height:1px;background:var(--line2);margin:8px 0"></div><p class="tag rep">Réponse</p><div class="atxt" style="font-size:17px">${c.reponse}</div>${img('a')}` : '<button class="link-discret" style="align-self:center;margin-top:8px;border:1.5px solid var(--ch);border-radius:999px;padding:0 16px;min-height:40px;text-decoration:none;color:var(--ch);font-weight:700" id="montrer">Afficher la réponse</button>'}</div>
    <div style="display:flex;justify-content:center;align-items:center;gap:28px"><button class="check" style="width:52px;min-height:52px;border-radius:999px;justify-content:center;border-color:var(--ch);opacity:${k.open > 1 ? 1 : .3}" id="prec">‹</button><b style="color:var(--muted)">${k.open} / ${cards.length}</b><button class="check" style="width:52px;min-height:52px;border-radius:999px;justify-content:center;border-color:var(--ch);opacity:${k.open < cards.length ? 1 : .3}" id="suiv">›</button></div>`, 'accueil');
    document.getElementById('liste').onclick = () => { k.open = 0; vConsulter(slug); };
    const m = document.getElementById('montrer'); if (m) m.onclick = () => { k.shown = true; vConsulter(slug); };
    document.getElementById('prec').onclick = () => { if (k.open > 1) { k.open--; k.shown = false; vConsulter(slug); } };
    document.getElementById('suiv').onclick = () => { if (k.open < cards.length) { k.open++; k.shown = false; vConsulter(slug); } };
    return;
  }
  page(head(`#/partie/${slug}`, p.titre, 'Consulter les cartes', `${esc(p.titre)} · ${cards.length} cartes · sans effet sur ta progression`) + `
  <label class="field mx">${ICON.search}<input id="q" placeholder="Chercher une notion" aria-label="Chercher une notion" value="${esc(k.q)}"></label>
  <div class="panel mx" style="padding:0;gap:0;overflow:hidden" id="liste"></div><p class="note" id="vide" hidden></p>`, 'accueil');
  const draw = () => {
    const q = norm(k.q.trim()); let n = 0;
    document.getElementById('liste').innerHTML = cards.map((c, i) => {
      if (q && !norm(c.titre + ' ' + c.question + ' ' + c.reponse).includes(q)) return '';
      n++; return `<button data-o="${i + 1}" style="display:flex;align-items:center;gap:12px;min-height:52px;padding:0 14px;border:none;border-bottom:1px solid var(--line2);background:var(--card);text-align:left;width:100%"><b style="width:26px;color:var(--ch)">${i + 1}</b><span style="flex:1;font-size:15px;font-weight:600">${esc(c.titre)}</span>${ICON.chev}</button>`;
    }).join('');
    const v = document.getElementById('vide'); v.hidden = n > 0; v.textContent = `Aucune carte ne contient « ${k.q} ».`;
    APP.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { k.open = +b.dataset.o; k.shown = false; vConsulter(slug); });
  };
  const inp = document.getElementById('q'); inp.oninput = () => { k.q = inp.value; draw(); }; draw();
}

/* ---------- progression ---------- */
async function vProgression() {
  const ch = chapitres(), all = ch.flatMap(idsChap), r = compte(all);
  let seances = null;
  if (!S.apercu) { try { const { data } = await sb.rpc('seances_semaine'); seances = data; } catch (e) { } }
  const leg = (col, n, l) => `<span style="flex:1;display:flex;flex-direction:column;align-items:center"><b style="font-size:24px;color:${col}">${n}</b><small style="font-size:12px;color:var(--muted);text-align:center">${l}</small></span>`;
  const chs = ch.map(c => {
    const ids = idsChap(c), rc = compte(ids), open = !!S.progOpen[c.num];
    const parts = open ? c.parties.map(p => { const rp = compte(idsPart(p)), vues = p.n - rp.nouvelle; return `<div style="padding:12px 0;border-top:1px solid var(--line2);display:flex;flex-direction:column;gap:6px"><b style="font-size:15px">${esc(p.titre)}</b>${barre(rp, p.n, 8)}<small style="color:var(--muted)">${vues ? resume(rp) : `${p.n} cartes, pas encore commencé`}</small></div>`; }).join('') : '';
    return `<div class="panel mx" style="padding:4px 16px;gap:0"><button data-p="${c.num}" style="display:flex;align-items:center;gap:12px;min-height:64px;border:none;background:none;padding:10px 0;text-align:left;width:100%;color:var(--ink)"><span class="num" style="background:var(--ch);color:#fff;font-size:13px">Ch.&#160;${c.num}</span><span style="flex:1;display:flex;flex-direction:column;gap:6px"><b style="font-size:16px">${esc(c.titre)}</b>${barre(rc, ids.length, 8)}</span><span>${open ? '▴' : '▾'}</span></button>${parts}</div>`;
  }).join('');
  page(`<div class="top home"><div><h1>Ma progression</h1>${seances !== null ? `<p>Cette semaine : ${seances} séance${seances > 1 ? 's' : ''}</p>` : ''}</div>${BADGE}</div>
  <div class="panel mx"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px;color:var(--title)">Mes flashcards</b><span style="font-size:14px;color:var(--muted)"><b style="color:var(--ink)">${all.length - r.nouvelle}</b> / ${all.length} cartes vues</span></div>
  ${barre(r, all.length || 1, 12)}<div class="etapes-leg">${ETAPES.map(([k, , pl]) => `<span><i style="background:${coulEtape(k)}"></i><b>${r[k]}</b><small>${pl}</small></span>`).join('')}</div></div>
  ${chs}`, 'progression');
  APP.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { surPlace(() => { S.progOpen[b.dataset.p] = !S.progOpen[b.dataset.p]; vProgression(); }); });
}

/* ---------- profil ---------- */
const THEMES = [['ocean', 'Bleu Océan', ['#0A2E6E', '#0B7A72', '#1B4FA8']], ['emeraude', 'Émeraude', ['#0B3D2E', '#0F6E56', '#B5651D']], ['violet', 'Violet Nuit', ['#231A55', '#5B48B5', '#B83F7E']]];
function vProfil() {
  const opts = THEMES.map(([k, nom, cols]) => `<button class="check ${S.theme === k ? 'on' : ''}" data-t="${k}" style="border-color:${S.theme === k ? 'var(--ch)' : 'var(--line)'};background:var(--card)"><span style="display:flex">${cols.map(c => `<span style="width:18px;height:18px;border-radius:999px;background:${c};border:2px solid #fff;margin-left:-6px"></span>`).join('')}</span><b style="flex:1;font-size:16px">${nom}</b>${S.theme === k ? '<span style="color:var(--ch);font-weight:800">✓</span>' : ''}</button>`).join('');
  page(`<div class="top home"><div><h1>Mon profil</h1><p>${esc(S.eleve ? S.eleve.identifiant : 'Professeur (aperçu)')}</p></div>${BADGE}</div>
  <div class="panel mx"><b style="font-size:17px;color:var(--title)">Thème de couleur</b>${opts}</div>
  <div class="panel mx"><b style="font-size:17px;color:var(--title)">Apparence</b><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${[['auto', 'Automatique'], ['clair', 'Clair'], ['sombre', 'Sombre']].map(([k, l]) => `<button class="check ${modeChoisi() === k ? 'on' : ''}" data-m="${k}" style="min-height:48px;justify-content:center;font-weight:700;font-size:14px;padding:6px">${l}</button>`).join('')}</div><small style="color:var(--muted);font-size:13px">« Automatique » suit le réglage de ton téléphone.</small></div>
  ${S.prof ? `<a class="big gen compact mx" href="#/prof"><span class="row"><span class="ic">${ICON.cal}</span><span class="t">Espace professeur</span><span class="go">${ICON.go}</span></span><span class="s">Retour au suivi de vos classes</span></a>` : ''}
  <div class="panel mx" style="gap:0;padding:4px 16px"><a href="#/bienvenue" style="min-height:52px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line2);text-decoration:none;font-weight:600">Revoir la visite guidée${ICON.chev}</a><a href="#/aide" style="min-height:52px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line2);text-decoration:none;font-weight:600">Installer PC Lab sur mon téléphone${ICON.chev}</a><p style="margin:0;padding:14px 2px;border-bottom:1px solid var(--line2);font-size:14px;color:var(--muted)">Code oublié ? Demande à ton professeur de le réinitialiser.</p>
  <button id="sortir" style="min-height:52px;border:none;background:none;text-align:left;color:#A3361C;font-size:15px;font-weight:700;padding:0 2px">Se déconnecter</button></div>`, 'profil');
  APP.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { surPlace(() => { localStorage.setItem('pclab_mode', b.dataset.m); appliquerMode(); vProfil(); }); });
  APP.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => {
    S.theme = b.dataset.t; document.documentElement.dataset.theme = S.theme; surPlace(vProfil);
    if (!S.apercu) { try { await sb.rpc('maj_preferences', { p_theme: S.theme }); } catch (e) { } }
  });
  document.getElementById('sortir').onclick = async () => { await sb.auth.signOut(); location.hash = ''; location.reload(); };
}


/* ---------- visite guidée (bulles) ---------- */
function tour(key, steps) {
  if (localStorage.getItem('pclab_tour_' + key)) return;
  steps = steps.filter(st => document.querySelector(st.sel));
  if (!steps.length) return;
  let i = 0;
  const fin = () => { localStorage.setItem('pclab_tour_' + key, '1'); document.getElementById('tour')?.remove(); };
  const show = () => {
    document.getElementById('tour')?.remove();
    const st = steps[i], el = document.querySelector(st.sel); if (!el) return fin();
    el.scrollIntoView({ block: 'center' });
    void document.body.offsetHeight;
    const r = el.getBoundingClientRect(), pad = 6, below = r.top < window.innerHeight / 2;
    const w = document.createElement('div'); w.id = 'tour';
    w.innerHTML = `<div style="position:fixed;inset:0;z-index:50"></div>
    <div style="position:fixed;z-index:51;left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;border-radius:18px;box-shadow:0 0 0 9999px rgba(10,20,40,.6);pointer-events:none"></div>
    <div role="dialog" style="position:fixed;z-index:52;left:16px;right:16px;max-width:420px;margin:0 auto;${below ? `top:${r.bottom + 14}px` : `bottom:${window.innerHeight - r.top + 14}px`};background:var(--card);border-radius:14px;padding:14px 16px;box-shadow:0 8px 24px rgba(0,0,0,.25)">
    <p style="margin:0 0 12px;font-size:16px;line-height:1.4">${st.text}</p>
    <div style="display:flex;justify-content:space-between;align-items:center"><button id="t-skip" style="border:none;background:none;color:var(--muted2);font-size:14px;min-height:40px;padding:0">Passer</button>
    <button id="t-next" style="border:none;border-radius:10px;background:var(--ch);color:#fff;font-weight:800;font-size:15px;min-height:40px;padding:0 16px">${i < steps.length - 1 ? `Suivant (${i + 1}/${steps.length})` : 'Compris'}</button></div></div>`;
    document.body.appendChild(w);
    document.getElementById('t-skip').onclick = fin;
    document.getElementById('t-next').onclick = () => { i++; i < steps.length ? show() : fin(); };
  };
  const go = () => requestAnimationFrame(() => requestAnimationFrame(show));
  setTimeout(go, 400);
  window.addEventListener('resize', () => { if (document.getElementById('tour')) show(); });
}
function revoirExplications() { Object.keys(localStorage).filter(k => k.startsWith('pclab_tour_')).forEach(k => localStorage.removeItem(k)); location.hash = '#/accueil'; }

function vAide(avantConnexion, retour) {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), android = /Android/.test(navigator.userAgent);
  const installe = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const share = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/></svg>';
  const etapes = (titre, list, on) => `<div class="panel mx" style="${on ? 'border:2px solid var(--ch)' : ''}"><b style="font-size:17px">${titre}</b><ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:8px;font-size:16px;line-height:1.45">${list.map(x => `<li>${x}</li>`).join('')}</ol></div>`;
  const html = `<div class="top"><div class="top-row"><button class="back" id="retour">${ICON.back}Retour</button>${BADGE}</div><h1>Installer PC Lab</h1><p>Sur l'écran d'accueil de ton téléphone</p></div>
  ${installe ? '<p class="note" style="color:#1D6B3E;font-weight:700">PC Lab est déjà installé sur ce téléphone.</p>' : ''}
  ${etapes('Sur iPhone', [`Ouvre le site dans <b>Safari</b>.`, `Touche le bouton <b>Partager</b> ${share} en bas de l'écran.`, `Choisis <b>« Sur l'écran d'accueil »</b> (fais défiler si besoin), puis <b>« Ajouter »</b>.`, `Ouvre PC Lab depuis la nouvelle icône et <b>connecte-toi une fois</b> avec ton identifiant et ton code.`], ios)}
  ${etapes('Sur Android', [`Ouvre le site dans <b>Chrome</b>.`, `Touche le menu <b>⋮</b> en haut à droite.`, `Choisis <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.`, `Ouvre PC Lab depuis la nouvelle icône.`], android)}
  <p class="note">Il faut une connexion Internet pour réviser. Ta progression est enregistrée en ligne : tu ne perds rien si tu changes de téléphone.</p>`;
  if (avantConnexion) APP.innerHTML = `<div class="scroll">${html}</div>`; else page(html, 'profil');
  document.getElementById('retour').onclick = () => retour ? retour() : (avantConnexion ? vLogin() : history.back());
}

/* ---------- connexion ---------- */
function vLogin(msg = '') {
  APP.innerHTML = `<div class="scroll"><div class="top home" style="padding-bottom:40px"><div><h1>PC Lab</h1><p>${DEVISE}</p></div>${BADGE}</div>
  <div class="panel mx" style="margin-top:-20px"><b style="font-size:18px">Connexion</b>
  <label class="field"><input id="ident" placeholder="Identifiant" autocomplete="username" autocapitalize="none"></label>
  <label class="field"><input id="pin" placeholder="Code à 6 chiffres" inputmode="numeric" type="password" maxlength="6" autocomplete="current-password"></label>
  <p class="err" id="err">${esc(msg)}</p><button class="btn-main ch" id="go">Se connecter</button></div>
  <p class="note">Ton identifiant et ton code t'ont été donnés par ton professeur.</p><button class="link-discret" id="aide">Installer PC Lab sur mon téléphone</button><button class="link-discret" id="profLog">Espace professeur</button></div>`;
  document.getElementById('aide').onclick = () => vAide(true);
  document.getElementById('profLog').onclick = () => vLoginProf();
  const go = async () => {
    const id = document.getElementById('ident').value.trim(), pin = document.getElementById('pin').value.trim();
    if (!id || pin.length < 6) { document.getElementById('err').textContent = 'Entre ton identifiant et ton code à 6 chiffres.'; return; }
    document.getElementById('go').disabled = true;
    const email = id.includes('@') ? id : id.toLowerCase() + EMAIL_DOMAIN;
    const { error } = await sb.auth.signInWithPassword({ email, password: pin });
    if (error) { document.getElementById('go').disabled = false; document.getElementById('err').textContent = 'Identifiant ou code incorrect.'; return; }
    demarrer();
  };
  document.getElementById('go').onclick = go;
  document.getElementById('pin').onkeydown = e => { if (e.key === 'Enter') go(); };
}

function vLoginProf(msg = '') {
  APP.classList.remove('large');
  APP.innerHTML = `<div class="scroll"><div class="top home" style="padding-bottom:40px"><div><h1>Espace professeur</h1><p>Connexion avec votre adresse e-mail</p></div>${BADGE}</div>
  <div class="panel mx" style="margin-top:-20px"><b style="font-size:18px">Connexion</b>
  <label class="field"><input id="em" type="email" placeholder="Adresse e-mail" autocomplete="username"></label>
  <label class="field"><input id="pw" type="password" placeholder="Mot de passe (8 caractères minimum)" autocomplete="current-password"></label>
  <p class="err" id="err">${esc(msg)}</p><button class="btn-main ch" id="go">Se connecter</button></div>
  <button class="link-discret" id="creer">Première utilisation : créer le compte professeur</button>
  <button class="link-discret" id="retour">Retour à la connexion élève</button></div>`;
  const val = () => [document.getElementById('em').value.trim(), document.getElementById('pw').value];
  const err = t => { document.getElementById('err').textContent = t; };
  document.getElementById('retour').onclick = () => vLogin();
  document.getElementById('go').onclick = async () => {
    const [email, password] = val(); if (!email || !password) return err('Indiquez votre e-mail et votre mot de passe.');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return err('E-mail ou mot de passe incorrect.');
    location.hash = '#/prof'; demarrer();
  };
  document.getElementById('creer').onclick = async () => {
    const [email, password] = val();
    if (!email || password.length < 8) return err('Indiquez votre e-mail et un mot de passe d\'au moins 8 caractères, puis touchez à nouveau ce lien.');
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return err('Création impossible : ' + error.message);
    sessionStorage.setItem('pclab_init_prof', '1');
    await sb.auth.signInWithPassword({ email, password });
    location.hash = '#/prof'; demarrer();
  };
}

/* ---------- démarrage ---------- */
async function demarrer() {
  APP.innerHTML = '<div class="scroll" style="align-items:center;justify-content:center"><span class="spin"></span></div>';
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return vLogin();
  const [idxR, elR] = await Promise.all([fetch('contenu/index.json').then(r => r.json()), sb.from('eleves').select('*').eq('user_id', session.user.id).maybeSingle()]);
  S.idx = idxR; S.eleve = elR.data || null;
  if (!S.eleve) {
    let { data: prof } = await sb.from('profs').select('id,nom').eq('id', session.user.id).maybeSingle();
    if (!prof && sessionStorage.getItem('pclab_init_prof')) {
      sessionStorage.removeItem('pclab_init_prof');
      const { data: ok } = await sb.rpc('initialiser_prof', { p_nom: null });
      if (ok) prof = { id: session.user.id, nom: null };
    }
    if (!prof) { await sb.auth.signOut(); return vLogin('Ce compte n\'est relié à aucun élève.'); }
    S.apercu = true; S.prof = prof;
    if (!location.hash || location.hash === '#/' || location.hash === '#/accueil') history.replaceState(null, '', '#/prof');
    try { S.suivi = JSON.parse(localStorage.getItem('pclab_apercu_suivi') || '{}'); } catch (e) { S.suivi = {}; }
  } else {
    S.theme = S.eleve.theme || 'ocean';
    try { const { data: cl } = await sb.from('classes').select('message,message_le').eq('id', S.eleve.classe_id).maybeSingle(); S.message = cl && cl.message ? cl : null; } catch (e) { }
    const { data: cc } = await sb.from('classe_chapitres').select('chapter_id').eq('classe_id', S.eleve.classe_id).eq('active', true);
    S.ouverts = (cc || []).map(x => +x.chapter_id);
    let from = 0;
    for (;;) {
      const { data, error } = await sb.from('carte_suivi').select('*').eq('eleve_id', S.eleve.id).range(from, from + 999);
      if (error) { S.baseKO = true; break; }
      if (!data) break;
      data.forEach(r => S.suivi[r.carte_id] = r);
      if (data.length < 1000) break; from += 1000;
    }
  }
  document.documentElement.dataset.theme = S.theme;
  route();
}
demarrer();
