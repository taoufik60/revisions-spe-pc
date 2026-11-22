/* PC Lab v2 — espace professeur
   Un écran = une question : accueil → groupe / élèves / chapitres, puis le détail. */
'use strict';

const P = { classes: [], classeId: null, el: null, cartes: null, cc: null, suivi: null, charge: 0, filtre: 'tous', cherche: '', proj: null };
const IC = {
  groupe: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>',
  eleves: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.6c3 .1 5.5 1.9 5.5 5.4"/></svg>',
  reglages: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  msg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  proj: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M12 17v4M8 21h8"/></svg>',
  print: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
};

/* ---------- mise en page ---------- */
const navProf = on => `<nav class="tabs t4" aria-label="Navigation professeur">
<a href="#/prof" class="${on === 'accueil' ? 'on' : ''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>Accueil</a>
<a href="#/prof/eleves" class="${on === 'eleves' ? 'on' : ''}">${IC.eleves.replace('width="24" height="24"', 'width="22" height="22"')}Élèves</a>
<a href="#/prof/chapitres" class="${on === 'chapitres' ? 'on' : ''}">${ICON.book.replace('width="24" height="24"', 'width="22" height="22"')}Chapitres</a>
<a href="#/prof/reglages" class="${on === 'reglages' ? 'on' : ''}">${IC.reglages}Réglages</a></nav>`;
function pageProf(html, tab) {
  document.getElementById('tour')?.remove();
  APP.classList.add('large');
  APP.innerHTML = `<div class="scroll">${html}</div>` + (tab === false ? '' : navProf(tab));
  window.scrollTo(0, 0);
}
const attente = () => pageProf('<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:60vh"><span class="spin"></span></div>', false);
const classe = () => P.classes.find(c => c.id === P.classeId);
const nomEl = e => e.prenom ? `${esc(e.prenom)} <small class="ident">${esc(e.identifiant)}</small>` : esc(e.identifiant);
const nomElTxt = e => e.prenom ? `${e.prenom} (${e.identifiant})` : e.identifiant;
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const pluriel = (n, mot, motPl) => `${n} ${n > 1 ? (motPl || mot + 's') : mot}`;
const dateFr = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const idsDe = c => c.parties.flatMap(p => Array.from({ length: p.n }, (_, i) => `${p.slug}-${String(i + 1).padStart(2, '0')}`));
const slugDe = id => id.replace(/-\d+$/, '');
const chapDe = id => partInfo(slugDe(id))?.c;
async function carteDe(id) { const cs = await loadPart(slugDe(id)); return cs.find(x => x.id === id); }
const toast = t => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); };

/* ---------- données ---------- */
async function chargerClasses() {
  const { data } = await sb.from('classes').select('*').order('nom');
  P.classes = data || [];
  const memo = localStorage.getItem('pclab_prof_classe');
  P.classeId = (P.classes.find(c => c.id === memo) || P.classes[0] || {}).id || null;
}
async function charger(force) {
  if (!P.classes.length) await chargerClasses();
  if (!P.classeId) return false;
  if (!force && P.el && Date.now() - P.charge < 60000) return true;
  const id = P.classeId;
  const [el, ca, cc] = await Promise.all([
    sb.rpc('prof_eleves', { p_classe: id }), sb.rpc('prof_cartes', { p_classe: id }),
    sb.from('classe_chapitres').select('chapter_id,active').eq('classe_id', id)]);
  P.el = (el.data || []).filter(e => e.actif);
  P.cartes = {}; (ca.data || []).forEach(r => P.cartes[r.carte_id] = r);
  P.cc = new Set((cc.data || []).filter(x => x.active).map(x => +x.chapter_id));
  P.suivi = [];
  const ids = P.el.map(e => e.eleve_id);
  for (let i = 0; i < ids.length; i += 40) {
    let from = 0;
    for (;;) {
      const { data } = await sb.from('carte_suivi').select('eleve_id,carte_id,boite,a_consolider').in('eleve_id', ids.slice(i, i + 40)).range(from, from + 999);
      if (!data) break; P.suivi.push(...data);
      if (data.length < 1000) break; from += 1000;
    }
  }
  P.charge = Date.now();
  return true;
}
const chapOuverts = () => S.idx.chapitres.filter(c => P.cc.has(c.num));
const objectif = () => classe()?.objectif_seances || 3;

/* ---------- statut d'un élève (phrase simple + couleur) ---------- */
function statut(e) {
  const obj = objectif();
  const j = e.derniere ? Math.floor((Date.now() - new Date(e.derniere)) / 86400000) : null;
  if (j === null) return { c: 'rouge', ordre: 0, t: 'N\'a encore jamais révisé' };
  if (j >= 10) return { c: 'rouge', ordre: 0, t: `Aucune révision depuis ${j} jours` };
  if (j >= 5) return { c: 'orange', ordre: 1, t: `Dernière révision il y a ${j} jours` };
  if (e.s1 < Math.ceil(obj / 2) && e.s0 < obj) return { c: 'orange', ordre: 1, t: `${pluriel(e.s1, 'séance')} la semaine dernière (objectif ${obj})` };
  return { c: 'vert', ordre: 2, t: `${pluriel(e.s0, 'séance')} cette semaine` + (j === 0 ? ' · a révisé aujourd\'hui' : '') };
}
const LIB = { rouge: 'Décroché', orange: 'À relancer', vert: 'Régulier' };

/* ---------- cartes les plus ratées ---------- */
function cartesRatees(filtreChap) {
  return Object.values(P.cartes)
    .filter(r => r.reponses >= 3 && (!filtreChap || chapDe(r.carte_id)?.num === filtreChap) && chapDe(r.carte_id))
    .map(r => ({ ...r, taux: r.non / r.reponses }))
    .filter(r => r.taux > 0)
    .sort((a, b) => b.taux - a.taux || b.consolider - a.consolider);
}

/* =====================================================================
   ACCUEIL
   ===================================================================== */
async function vProfAccueil() {
  attente();
  if (!(await charger())) return vProfBienvenue();
  const cl = classe(), n = P.el.length, obj = objectif();
  const st = P.el.map(statut), rouge = st.filter(s => s.c === 'rouge').length, orange = st.filter(s => s.c === 'orange').length;
  const atteint = P.el.filter(e => e.s0 >= obj).length;
  const top = cartesRatees()[0], carteTop = top ? await carteDe(top.carte_id) : null;
  const choixClasse = P.classes.length > 1 ? `<select id="selClasse" class="sel-classe" aria-label="Classe">${P.classes.map(c => `<option value="${c.id}" ${c.id === P.classeId ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select>` : `<span class="pill-classe">${esc(cl.nom)}</span>`;
  const lignes = [];
  if (!n) lignes.push(`<a class="alerte" href="#/prof/reglages/comptes"><span class="dot orange"></span><span>Aucun compte élève : <b>créez les comptes</b> de la classe.</span>${ICON.chev}</a>`);
  else {
    lignes.push(rouge + orange
      ? `<a class="alerte" href="#/prof/eleves/relancer"><span class="dot ${rouge ? 'rouge' : 'orange'}"></span><span>${rouge ? `<b>${pluriel(rouge, 'élève décroché', 'élèves décrochés')}</b>` : ''}${rouge && orange ? ' et ' : ''}${orange ? `<b>${pluriel(orange, 'élève', 'élèves')} à relancer</b>` : ''}</span>${ICON.chev}</a>`
      : `<div class="alerte"><span class="dot vert"></span><span>Tous les élèves révisent régulièrement.</span></div>`);
    lignes.push(`<a class="alerte" href="#/prof/groupe"><span class="dot ${atteint >= n / 2 ? 'vert' : 'orange'}"></span><span><b>${atteint} / ${n}</b> ont déjà atteint l'objectif de la semaine (${pluriel(obj, 'séance')})</span>${ICON.chev}</a>`);
    if (carteTop) lignes.push(`<a class="alerte" href="#/prof/projection/0/${encodeURIComponent(top.carte_id)}"><span class="dot rouge"></span><span>Carte la plus ratée : <b>${esc(carteTop.titre)}</b> <small>(Ch. ${chapDe(top.carte_id).num}, ${pct(top.non, top.reponses)} % de « Non »)</small></span>${IC.proj}</a>`);
  }
  if (!P.cc.size) lignes.push(`<a class="alerte" href="#/prof/reglages/chapitres"><span class="dot orange"></span><span>Aucun chapitre ouvert : les élèves ne voient rien. <b>Ouvrir des chapitres</b></span>${ICON.chev}</a>`);
  pageProf(`<div class="top home"><div><h1>Espace professeur</h1><p class="row-classe">Classe : ${choixClasse}</p></div>${BADGE}</div>
  <div class="grid2 mx" style="margin-top:4px">
    <section class="panel"><b class="ptitre">Cette semaine</b>${lignes.join('')}</section>
    <section class="panel" id="zoneMsg">${blocMessage(cl)}</section>
  </div>
  <div class="tuiles mx">
    ${tuile('gen', '#/prof/groupe', IC.groupe, 'Le groupe', 'Régularité et progression de la classe')}
    ${tuile('gen', '#/prof/eleves', IC.eleves, 'Les élèves', n ? `${pluriel(n, 'élève')}, ${rouge + orange} à suivre` : 'Aucun élève')}
    ${tuile('ch', '#/prof/chapitres', ICON.book, 'Les chapitres', `${pluriel(P.cc.size, 'chapitre ouvert', 'chapitres ouverts')}`)}
  </div>
  <a class="link-discret" href="#/accueil" style="align-self:center">Voir l'application comme un élève</a>`, 'accueil');
  document.getElementById('selClasse')?.addEventListener('change', e => changerClasse(e.target.value));
  brancherMessage();
}
const tuile = (cls, href, icon, t, s) => `<a class="big ${cls} compact" href="${href}"><span class="row"><span class="ic">${icon}</span><span class="t">${t}</span><span class="go">${ICON.go}</span></span><span class="s">${s}</span></a>`;
async function changerClasse(id) { P.classeId = id; localStorage.setItem('pclab_prof_classe', id); P.el = null; await vProfAccueil(); }

/* ---------- message aux élèves ---------- */
function blocMessage(cl) {
  const m = cl.message || '';
  return `<b class="ptitre">${IC.msg} Message aux élèves</b>
  ${m ? `<div class="msg-apercu">${esc(m).replace(/\n/g, '<br>')}</div><p class="petit">Affiché sur l'accueil des élèves depuis le ${dateFr(cl.message_le)}.</p>
     <div class="btns"><button class="btn-sec" id="msgModif">Modifier</button><button class="btn-sec danger" id="msgRetirer">Retirer</button></div>`
  : `<textarea id="msgTxt" rows="3" maxlength="400" placeholder="Ex. : DS vendredi sur le chapitre 5. Révisez les cartes « Champ de pesanteur » !"></textarea>
     <div class="btns"><button class="btn-sec plein" id="msgPublier">Publier</button></div>`}`;
}
function brancherMessage() {
  const cl = classe(), z = document.getElementById('zoneMsg'); if (!z) return;
  const maj = async (message) => {
    const { error } = await sb.from('classes').update({ message, message_le: message ? new Date().toISOString() : null }).eq('id', cl.id);
    if (error) return toast('Impossible d\'enregistrer le message.');
    cl.message = message; cl.message_le = new Date().toISOString(); z.innerHTML = blocMessage(cl); brancherMessage();
    toast(message ? 'Message publié.' : 'Message retiré.');
  };
  document.getElementById('msgPublier')?.addEventListener('click', () => { const t = document.getElementById('msgTxt').value.trim(); if (t) maj(t); });
  document.getElementById('msgRetirer')?.addEventListener('click', () => maj(null));
  document.getElementById('msgModif')?.addEventListener('click', () => {
    z.innerHTML = `<b class="ptitre">${IC.msg} Message aux élèves</b><textarea id="msgTxt" rows="3" maxlength="400">${esc(cl.message)}</textarea><div class="btns"><button class="btn-sec plein" id="msgPublier">Publier</button></div>`;
    brancherMessage();
  });
}

/* ---------- premier lancement ---------- */
function vProfBienvenue() {
  pageProf(`<div class="top home"><div><h1>Bienvenue !</h1><p>Créez votre première classe pour commencer.</p></div>${BADGE}</div>
  <section class="panel mx"><b class="ptitre">Nouvelle classe</b>
    <label class="field"><input id="cNom" placeholder="Nom de la classe (ex. TS1 Spé PC)"></label>
    <label class="field"><input id="cAn" placeholder="Année scolaire (ex. 2026-2027)" value="2026-2027"></label>
    <button class="btn-main ch" id="cCreer">Créer la classe</button></section>`, false);
  document.getElementById('cCreer').onclick = creerClasse;
}
async function creerClasse() {
  const nom = document.getElementById('cNom').value.trim(); if (!nom) return toast('Donnez un nom à la classe.');
  const { data, error } = await sb.from('classes').insert({ prof_id: S.prof.id, nom, annee: document.getElementById('cAn')?.value.trim() || null }).select().single();
  if (error) return toast('Création impossible : ' + error.message);
  P.classes.push(data); P.classeId = data.id; localStorage.setItem('pclab_prof_classe', data.id); P.el = null;
  location.hash = '#/prof/reglages/comptes';
}

/* =====================================================================
   LE GROUPE
   ===================================================================== */
async function vProfGroupe() {
  attente(); await charger();
  const n = P.el.length, obj = objectif();
  const sem = ['s3', 's2', 's1', 's0'], noms = ['Il y a 3 sem.', 'Il y a 2 sem.', 'Sem. dernière', 'Cette semaine'];
  const parSem = sem.map(k => ({ atteint: P.el.filter(e => e[k] >= obj).length, moy: n ? P.el.reduce((s, e) => s + e[k], 0) / n : 0 }));
  const st = P.el.map(statut), cpt = { vert: 0, orange: 0, rouge: 0 }; st.forEach(s => cpt[s.c]++);
  const actifs = P.el.filter(e => e.jours_7 > 0).length;
  const acquises = P.el.reduce((s, e) => s + e.acquises, 0);
  const totalOuvert = chapOuverts().reduce((s, c) => s + idsChap(c).length, 0);
  pageProf(head('#/prof', 'Accueil', 'Le groupe', `${esc(classe().nom)} · ${pluriel(n, 'élève')}`) + `
  <div class="kpis mx">
    ${kpi(`${actifs}<small>/${n}</small>`, 'élèves ont révisé ces 7 derniers jours')}
    ${kpi(`${parSem[2].atteint}<small>/${n}</small>`, `ont atteint l'objectif la semaine dernière (${pluriel(obj, 'séance')})`)}
    ${kpi(`${pct(acquises, n * totalOuvert)}<small> %</small>`, 'des cartes des chapitres ouverts sont acquises')}
  </div>
  <section class="panel mx"><b class="ptitre">Objectif de la semaine atteint</b><p class="petit">Nombre d'élèves ayant fait au moins ${pluriel(obj, 'séance')} (une séance = un jour avec au moins 5 cartes).</p>
    <div class="barres">${parSem.map((s, i) => `<div class="barre-col"><div class="barre-val">${s.atteint}</div><div class="barre" style="height:${Math.max(4, pct(s.atteint, n))}%"></div><div class="barre-lab">${noms[i]}</div></div>`).join('')}</div>
    <p class="petit">En moyenne cette semaine : ${parSem[3].moy.toFixed(1).replace('.', ',')} séance par élève.</p></section>
  <section class="panel mx"><b class="ptitre">Où en sont les élèves ?</b>
    <div class="repart">${['vert', 'orange', 'rouge'].map(c => cpt[c] ? `<div class="rep ${c}" style="flex:${cpt[c]}"></div>` : '').join('')}</div>
    ${['vert', 'orange', 'rouge'].map(c => `<a class="alerte" href="#/prof/eleves/${c === 'vert' ? 'reguliers' : c === 'orange' ? 'relancer' : 'decroches'}"><span class="dot ${c}"></span><span><b>${cpt[c]}</b> ${LIB[c].toLowerCase()}${cpt[c] > 1 && c !== 'orange' ? 's' : ''}</span>${ICON.chev}</a>`).join('')}
  </section>
  <div class="btns mx"><button class="btn-sec" id="exp">${IC.print} Exporter vers un tableur</button></div>`, 'accueil');
  document.getElementById('exp').onclick = exporterCSV;
}
const kpi = (v, t) => `<div class="kpi"><div class="kpi-v">${v}</div><div class="kpi-t">${t}</div></div>`;

function exporterCSV() {
  const ch = chapOuverts();
  const ent = ['Identifiant', 'Prénom', 'Statut', 'Dernière révision', 'Séances cette semaine', 'Séances sem. -1', 'Séances sem. -2', 'Séances sem. -3', 'Cartes vues', 'Cartes acquises', 'Cartes à consolider', ...ch.map(c => `Ch. ${c.num} acquis (%)`)];
  const lignes = P.el.map(e => {
    const st = statut(e), s = P.suivi.filter(x => x.eleve_id === e.eleve_id);
    return [e.identifiant, e.prenom || '', LIB[st.c], e.derniere ? new Date(e.derniere).toLocaleDateString('fr-FR') : '', e.s0, e.s1, e.s2, e.s3, e.vues, e.acquises, e.a_consolider,
      ...ch.map(c => { const ids = new Set(idsChap(c)); return pct(s.filter(x => ids.has(x.carte_id) && x.boite >= 4 && !x.a_consolider).length, ids.size); })];
  });
  const csv = [ent, ...lignes].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `PC-Lab_${classe().nom.replace(/\W+/g, '-')}_${auj()}.csv`; a.click();
}

/* =====================================================================
   LES ÉLÈVES
   ===================================================================== */
async function vProfEleves(filtre) {
  if (filtre) P.filtre = filtre;
  attente(); await charger();
  const filtres = [['tous', 'Tous'], ['relancer', 'À suivre'], ['decroches', 'Décrochés'], ['reguliers', 'Réguliers']];
  const ok = e => { const c = statut(e).c; return P.filtre === 'tous' || (P.filtre === 'relancer' && c !== 'vert') || (P.filtre === 'decroches' && c === 'rouge') || (P.filtre === 'reguliers' && c === 'vert'); };
  const q = P.cherche.toLowerCase();
  const liste = P.el.filter(e => ok(e) && (!q || (e.identifiant + ' ' + (e.prenom || '')).toLowerCase().includes(q)))
    .map(e => ({ e, st: statut(e) })).sort((a, b) => a.st.ordre - b.st.ordre || a.e.identifiant.localeCompare(b.e.identifiant));
  const obj = objectif();
  pageProf(head('#/prof', 'Accueil', 'Les élèves', `${esc(classe().nom)} · touchez un élève pour voir sa fiche`) + `
  <div class="mx outils"><label class="field" style="flex:1">${ICON.search}<input id="cherche" placeholder="Chercher un élève" value="${esc(P.cherche)}"></label></div>
  <div class="chips mx">${filtres.map(([k, l]) => `<button class="chip ${P.filtre === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
  <div class="mx liste-el">${liste.map(({ e, st }) => `<a class="item el" href="#/prof/eleve/${e.eleve_id}"><span class="dot ${st.c}" title="${LIB[st.c]}"></span>
    <span class="body"><span class="tt">${nomEl(e)}</span><span class="meta">${esc(st.t)}</span></span>
    <span class="jauge" title="Séances cette semaine"><b>${e.s0}</b>/${obj}</span>${ICON.chev}</a>`).join('') || '<p class="note">Aucun élève dans cette catégorie.</p>'}</div>
  <p class="note">Le chiffre à droite : séances cette semaine / objectif.</p>`, 'eleves');
  APP.querySelectorAll('[data-f]').forEach(b => b.onclick = () => surPlace(() => vProfEleves(b.dataset.f)));
  const c = document.getElementById('cherche');
  c.oninput = () => { P.cherche = c.value; clearTimeout(c._t); c._t = setTimeout(async () => { await vProfEleves(); const n = document.getElementById('cherche'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
}

/* ---------- fiche élève ---------- */
async function vProfEleve(id) {
  attente(); await charger();
  const e = P.el.find(x => x.eleve_id === id); if (!e) return vProfEleves();
  const st = statut(e), obj = objectif(), s = P.suivi.filter(x => x.eleve_id === id);
  const parId = {}; s.forEach(x => parId[x.carte_id] = x);
  const ch = chapOuverts();
  const lignesChap = ch.map(c => {
    const ids = idsChap(c), acq = ids.filter(i => parId[i] && parId[i].boite >= 4 && !parId[i].a_consolider).length;
    const cons = ids.filter(i => parId[i] && (parId[i].a_consolider || parId[i].boite <= 1)).length, vues = ids.filter(i => parId[i]).length;
    return `<div class="maitrise"><div class="m-lab"><b>Ch. ${c.num}</b> ${esc(c.titre)}</div><div class="m-barre"><span class="acq" style="width:${pct(acq, ids.length)}%"></span><span class="cours" style="width:${pct(vues - acq - cons, ids.length)}%"></span><span class="cons" style="width:${pct(cons, ids.length)}%"></span></div><div class="m-val">${pct(acq, ids.length)} %</div></div>`;
  }).join('');
  const aCons = s.filter(x => x.a_consolider || x.boite <= 1).map(x => x.carte_id).filter(chapDe);
  const cartes = await Promise.all(aCons.slice(0, 40).map(carteDe));
  const sem = [['s3', '-3'], ['s2', '-2'], ['s1', '-1'], ['s0', 'cette sem.']];
  pageProf(head('#/prof/eleves', 'Les élèves', e.prenom ? esc(e.prenom) : esc(e.identifiant), e.prenom ? esc(e.identifiant) : '') + `
  <div class="grid2 mx">
    <section class="panel"><b class="ptitre">Régularité</b>
      <div class="alerte"><span class="dot ${st.c}"></span><span><b>${LIB[st.c]}</b> · ${esc(st.t)}</span></div>
      <div class="mini-barres">${sem.map(([k, l]) => `<div class="barre-col"><div class="barre-val">${e[k]}</div><div class="barre ${e[k] >= obj ? '' : 'faible'}" style="height:${Math.max(4, Math.min(100, pct(e[k], Math.max(obj, 5))))}%"></div><div class="barre-lab">${l}</div></div>`).join('')}</div>
      <p class="petit">Séances par semaine (objectif : ${obj}). Dernière révision : ${e.derniere ? dateFr(e.derniere) : 'jamais'}.</p></section>
    <section class="panel"><b class="ptitre">Cartes</b>
      ${kpi(e.acquises, 'cartes acquises')}${kpi(e.a_consolider, 'cartes à consolider')}${kpi(e.vues, 'cartes déjà vues')}</section>
  </div>
  <section class="panel mx"><b class="ptitre">Maîtrise par chapitre</b>
    <p class="petit legende"><span class="l acq"></span>acquises <span class="l cours"></span>en cours <span class="l cons"></span>à consolider</p>
    ${lignesChap || '<p class="petit">Aucun chapitre ouvert.</p>'}</section>
  <section class="panel mx"><b class="ptitre">Ses cartes à consolider${aCons.length ? ` (${aCons.length})` : ''}</b>
    ${cartes.length ? cartes.filter(Boolean).map(c => `<div class="ligne-carte"><span class="chn-mini">Ch. ${chapDe(c.id).num}</span>${esc(c.titre)}</div>`).join('') : '<p class="petit">Aucune carte à consolider.</p>'}
    ${aCons.length > 40 ? `<p class="petit">… et ${aCons.length - 40} autres.</p>` : ''}</section>
  <div class="btns mx noprint">
    <button class="btn-sec" id="imprimer">${IC.print} Imprimer la fiche</button>
    <button class="btn-sec" id="prenom">Ajouter / modifier le prénom</button>
    <button class="btn-sec" id="pin">Nouveau code de connexion</button>
  </div>
  <p class="note noprint">Le prénom n'est visible que par vous. Les élèves ne voient jamais les résultats des autres.</p>`, 'eleves');
  document.getElementById('imprimer').onclick = () => window.print();
  document.getElementById('prenom').onclick = async () => {
    const v = prompt('Prénom de l\'élève (laisser vide pour retirer) :', e.prenom || ''); if (v === null) return;
    const { error } = await sb.from('eleves').update({ prenom: v.trim() || null }).eq('id', id);
    if (error) return toast('Enregistrement impossible.'); e.prenom = v.trim() || null; vProfEleve(id);
  };
  document.getElementById('pin').onclick = async () => {
    if (!confirm(`Créer un nouveau code pour ${nomElTxt(e)} ? L'ancien code ne fonctionnera plus.`)) return;
    const { data, error } = await sb.rpc('prof_nouveau_pin', { p_eleve: id });
    if (error) return toast('Impossible de créer un nouveau code.');
    alert(`Nouveau code de ${nomElTxt(e)} : ${data}\n\nNotez-le maintenant : il ne sera plus affiché.`);
  };
}

/* =====================================================================
   LES CHAPITRES
   ===================================================================== */
function statsChap(c) {
  const ids = new Set(idsChap(c)), n = P.el.length;
  const s = P.suivi.filter(x => ids.has(x.carte_id));
  const acq = s.filter(x => x.boite >= 4 && !x.a_consolider).length, cons = s.filter(x => x.a_consolider || x.boite <= 1).length;
  let rep = 0, non = 0; ids.forEach(i => { const r = P.cartes[i]; if (r) { rep += r.reponses; non += r.non; } });
  return { nCartes: ids.size, acq: pct(acq, n * ids.size), cons, rep, non: pct(non, rep) };
}
async function vProfChapitres() {
  attente(); await charger();
  const ch = chapOuverts();
  pageProf(head('#/prof', 'Accueil', 'Les chapitres', `${esc(classe().nom)} · chapitres ouverts aux élèves`) + `
  <div class="mx liste-ch">${ch.map(c => { const st = statsChap(c); return `<a class="item" href="#/prof/chapitre/${c.num}"><span class="num">Ch.&#160;${c.num}</span>
    <span class="body"><span class="tt">${esc(c.titre)}</span><span class="meta">${st.acq} % acquis par la classe · ${st.rep ? `${st.non} % de « Non »` : 'pas encore travaillé'}</span>
    <span class="prog"><span style="width:${st.acq}%"></span></span></span>${ICON.chev}</a>`; }).join('') || '<p class="note">Aucun chapitre ouvert pour le moment.</p>'}</div>
  <a class="row-link mx" href="#/prof/reglages/chapitres"><span><b>Ouvrir ou fermer des chapitres</b><small>${pluriel(ch.length, 'chapitre ouvert', 'chapitres ouverts')} sur ${S.idx.chapitres.length}</small></span>${ICON.chev}</a>`, 'chapitres');
}
async function vProfChapitre(num) {
  attente(); await charger();
  const c = chap(num); if (!c) return vProfChapitres();
  const st = statsChap(c), ratees = cartesRatees(c.num).slice(0, 8);
  const cartes = await Promise.all(ratees.map(r => carteDe(r.carte_id)));
  const ids = new Set(idsChap(c));
  const diff = P.el.map(e => ({ e, n: P.suivi.filter(x => x.eleve_id === e.eleve_id && ids.has(x.carte_id) && (x.a_consolider || x.boite <= 1)).length }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 6);
  const parties = c.parties.map(p => {
    const pi = new Set(Array.from({ length: p.n }, (_, i) => `${p.slug}-${String(i + 1).padStart(2, '0')}`));
    const acq = P.suivi.filter(x => pi.has(x.carte_id) && x.boite >= 4 && !x.a_consolider).length;
    return `<div class="maitrise"><div class="m-lab">${esc(p.titre)}</div><div class="m-barre"><span class="acq" style="width:${pct(acq, P.el.length * p.n)}%"></span></div><div class="m-val">${pct(acq, P.el.length * p.n)} %</div></div>`;
  }).join('');
  pageProf(head('#/prof/chapitres', 'Les chapitres', `Ch. ${c.num} · ${esc(c.titre)}`, `${st.nCartes} cartes`) + `
  <div class="kpis mx">${kpi(`${st.acq}<small> %</small>`, 'des cartes acquises par la classe')}${kpi(`${st.non}<small> %</small>`, 'de réponses « Non »')}${kpi(st.cons, 'cartes à consolider (tous élèves)')}</div>
  <section class="panel mx"><b class="ptitre">À reprendre en classe</b><p class="petit">Les cartes les plus ratées. Touchez « Projeter » pour l'afficher en grand.</p>
    ${ratees.length ? ratees.map((r, i) => `<div class="ligne-ratee"><div class="lr-txt"><b>${esc(cartes[i]?.titre || r.carte_id)}</b><small>${esc(partInfo(slugDe(r.carte_id))?.p.titre || '')} · ${pct(r.non, r.reponses)} % de « Non » · ${pluriel(r.consolider, 'élève', 'élèves')} à consolider</small></div>
      <a class="btn-sec petit-btn" href="#/prof/projection/${c.num}/${encodeURIComponent(r.carte_id)}">${IC.proj} Projeter</a></div>`).join('') : '<p class="petit">Pas encore assez de réponses sur ce chapitre.</p>'}</section>
  <div class="grid2 mx">
    <section class="panel"><b class="ptitre">Élèves en difficulté sur ce chapitre</b>
      ${diff.length ? diff.map(({ e, n }) => `<a class="alerte" href="#/prof/eleve/${e.eleve_id}"><span class="dot orange"></span><span>${nomEl(e)} · ${pluriel(n, 'carte')} à consolider</span>${ICON.chev}</a>`).join('') : '<p class="petit">Aucun élève en difficulté pour l\'instant.</p>'}</section>
    <section class="panel"><b class="ptitre">Par partie</b>${parties}</section>
  </div>`, 'chapitres');
}

/* ---------- projection en classe ---------- */
async function vProfProjection(num, carteId) {
  attente(); await charger();
  const liste = cartesRatees(+num || null).slice(0, 8).map(r => r.carte_id);
  if (!liste.includes(carteId)) liste.unshift(carteId);
  let k = liste.indexOf(carteId), voir = false;
  const retour = +num ? `#/prof/chapitre/${num}` : '#/prof';
  const dessiner = async () => {
    const c = await carteDe(liste[k]); if (!c) return;
    const img = side => c.image && c.image_cote === side ? `<img src="img/${esc(c.image)}" alt="Schéma">` : '';
    document.getElementById('tour')?.remove(); APP.classList.add('large');
    APP.innerHTML = `<div class="proj"><div class="proj-haut"><a class="back" href="${retour}">${ICON.back}Quitter</a><span>Carte ${k + 1} / ${liste.length} · Ch. ${chapDe(c.id).num} · ${esc(c.titre)}</span></div>
      <div class="proj-carte">${!voir ? `<p class="tag">${c.type ? esc(c.type) : 'Question'}</p><div class="qtxt">${c.question}</div>${img('q')}` : `<p class="tag rep">Réponse</p><div class="atxt">${c.reponse}</div>${img('a')}`}</div>
      <div class="proj-bas"><button class="btn-sec" id="prec" ${k ? '' : 'disabled'}>‹ Précédente</button><button class="btn-main ch" id="voir">${voir ? 'Revoir la question' : 'Afficher la réponse'}</button><button class="btn-sec" id="suiv" ${k < liste.length - 1 ? '' : 'disabled'}>Suivante ›</button></div></div>`;
    document.getElementById('voir').onclick = () => { voir = !voir; dessiner(); };
    document.getElementById('prec').onclick = () => { k--; voir = false; dessiner(); };
    document.getElementById('suiv').onclick = () => { k++; voir = false; dessiner(); };
  };
  dessiner();
}

/* =====================================================================
   RÉGLAGES
   ===================================================================== */
async function vProfReglages(sous) {
  if (sous === 'chapitres') return vRegChapitres();
  if (sous === 'comptes') return vRegComptes();
  if (sous === 'classe') return vRegClasse();
  attente(); await charger();
  const cl = classe();
  pageProf(head('#/prof', 'Accueil', 'Réglages', esc(cl.nom)) + `
  <div class="mx liste-reg">
    <a class="row-link" href="#/prof/reglages/chapitres"><span><b>Chapitres ouverts aux élèves</b><small>${pluriel(P.cc.size, 'chapitre ouvert', 'chapitres ouverts')}</small></span>${ICON.chev}</a>
    <a class="row-link" href="#/prof/reglages/comptes"><span><b>Comptes élèves et codes</b><small>${pluriel(P.el.length, 'compte')} · créer, imprimer</small></span>${ICON.chev}</a>
    <div class="row-link"><span><b>Objectif de la semaine</b><small>Séances attendues par élève</small></span><span class="stepper"><button id="objM" aria-label="Moins">−</button><b id="objV">${objectif()}</b><button id="objP" aria-label="Plus">+</button></span></div>
    <a class="row-link" href="#/prof/reglages/classe"><span><b>Classes</b><small>Renommer, créer une autre classe</small></span>${ICON.chev}</a>
    <button class="row-link" id="exp"><span><b>Exporter les résultats</b><small>Fichier pour Excel ou LibreOffice</small></span>${ICON.chev}</button>
    <a class="row-link" href="#/accueil"><span><b>Voir l'application comme un élève</b><small>Votre progression de test reste sur cet appareil</small></span>${ICON.chev}</a>
    <a class="row-link" href="#/profil"><span><b>Apparence</b><small>Couleurs, mode clair ou sombre</small></span>${ICON.chev}</a>
    <button class="row-link" id="deco"><span><b>Se déconnecter</b></span></button>
  </div>`, 'reglages');
  const majObj = async d => {
    const v = Math.min(7, Math.max(1, objectif() + d)); if (v === objectif()) return;
    const { error } = await sb.from('classes').update({ objectif_seances: v }).eq('id', cl.id);
    if (error) return toast('Enregistrement impossible.');
    cl.objectif_seances = v; document.getElementById('objV').textContent = v;
  };
  document.getElementById('objM').onclick = () => majObj(-1);
  document.getElementById('objP').onclick = () => majObj(1);
  document.getElementById('exp').onclick = exporterCSV;
  document.getElementById('deco').onclick = async () => { await sb.auth.signOut(); location.hash = ''; location.reload(); };
}

async function vRegChapitres() {
  attente(); await charger();
  const rows = S.idx.chapitres.map(c => `<button class="check ${P.cc.has(c.num) ? 'on' : ''}" data-ch="${c.num}"><span class="box">${P.cc.has(c.num) ? ICON.ok : ''}</span><span style="flex:1;display:flex;flex-direction:column"><b style="font-size:15px">Ch. ${c.num} · ${esc(c.titre)}</b><small style="color:var(--muted)">${pluriel(idsChap(c).length, 'carte')}</small></span></button>`).join('');
  pageProf(head('#/prof/reglages', 'Réglages', 'Chapitres ouverts', 'Ouvrez chaque chapitre quand il a été vu en classe') + `<div class="mx liste-chk">${rows}</div>`, 'reglages');
  APP.querySelectorAll('[data-ch]').forEach(b => b.onclick = async () => {
    const n = +b.dataset.ch, on = !P.cc.has(n);
    const { error } = await sb.from('classe_chapitres').upsert({ classe_id: P.classeId, chapter_id: n, active: on, activated_at: on ? new Date().toISOString() : null });
    if (error) return toast('Enregistrement impossible.');
    on ? P.cc.add(n) : P.cc.delete(n); surPlace(vRegChapitres);
  });
}

async function vRegComptes(codes) {
  attente(); await charger(true);
  const cl = classe();
  const pre = (cl.nom.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) || 'PC') + '-' + String(new Date().getFullYear()).slice(2);
  const tab = P.el.length ? `<table class="tab-comptes"><thead><tr><th>Identifiant</th><th>Prénom</th><th>Code</th></tr></thead><tbody>${P.el.map(e => `<tr><td><b>${esc(e.identifiant)}</b></td><td>${esc(e.prenom || '')}</td><td>${codes && codes[e.identifiant] ? `<b>${codes[e.identifiant]}</b>` : '••••••'}</td></tr>`).join('')}</tbody></table>` : '<p class="petit">Aucun compte pour le moment.</p>';
  pageProf(head('#/prof/reglages', 'Réglages', 'Comptes élèves', esc(cl.nom)) + `
  ${codes ? `<section class="panel mx alerte-codes"><b>Codes visibles une seule fois.</b> Imprimez cette page maintenant, puis découpez une bande par élève.</section>` : ''}
  <section class="panel mx noprint"><b class="ptitre">Créer des comptes</b><p class="petit">Chaque élève reçoit un identifiant et un code à 6 chiffres. Aucun nom n'est demandé : vous pourrez ajouter un prénom, visible de vous seul, depuis la fiche de l'élève.</p>
    <div class="ligne-form"><label class="field"><span class="petit">Préfixe</span><input id="pre" value="${esc(pre)}"></label><label class="field"><span class="petit">Nombre</span><input id="nb" type="number" min="1" max="45" value="${P.el.length ? 1 : 30}"></label></div>
    <button class="btn-main gen" id="creer">Créer les comptes</button><p class="petit" id="avance"></p></section>
  <section class="panel mx"><b class="ptitre">${pluriel(P.el.length, 'compte')}</b>${tab}</section>
  <div class="btns mx noprint"><button class="btn-sec" id="imp">${IC.print} Imprimer la liste</button></div>
  <p class="note noprint">Un élève a perdu son code ? Ouvrez sa fiche (onglet Élèves) et touchez « Nouveau code de connexion ».</p>`, 'reglages');
  document.getElementById('imp').onclick = () => window.print();
  document.getElementById('creer').onclick = creerComptes;
}
async function creerComptes() {
  const pre = document.getElementById('pre').value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, ''), nb = Math.min(45, +document.getElementById('nb').value || 0);
  if (!pre || !nb) return toast('Indiquez un préfixe et un nombre.');
  const btn = document.getElementById('creer'), av = document.getElementById('avance'); btn.disabled = true;
  const sbEl = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'pclab_creation' } });
  const existants = new Set(P.el.map(e => e.identifiant)), codes = {};
  let k = 0, faits = 0;
  while (faits < nb && k < nb + 200) {
    k++; const ident = `${pre}-${String(k).padStart(2, '0')}`; if (existants.has(ident)) continue;
    const pin = String(100000 + Math.floor(Math.random() * 900000));
    av.textContent = `Création de ${ident}… (${faits + 1} / ${nb})`;
    const { data: au, error: e1 } = await sbEl.auth.signUp({ email: ident.toLowerCase() + EMAIL_DOMAIN, password: pin });
    if (e1 || !au?.user) { av.textContent = `Arrêt sur ${ident} : ${e1?.message || 'erreur'}. Les comptes déjà créés sont conservés.`; break; }
    const { error: e2 } = await sb.from('eleves').insert({ classe_id: P.classeId, identifiant: ident, user_id: au.user.id });
    if (e2) { av.textContent = `Arrêt sur ${ident} : ${e2.message}`; break; }
    await sbEl.auth.signOut(); codes[ident] = pin; faits++;
  }
  btn.disabled = false;
  if (faits) vRegComptes(codes);
}

async function vRegClasse() {
  attente(); await charger();
  const cl = classe();
  pageProf(head('#/prof/reglages', 'Réglages', 'Classes') + `
  <section class="panel mx"><b class="ptitre">Classe actuelle</b><label class="field"><input id="nom" value="${esc(cl.nom)}"></label><div class="btns"><button class="btn-sec plein" id="ren">Renommer</button></div></section>
  ${P.classes.length > 1 ? `<section class="panel mx"><b class="ptitre">Changer de classe</b>${P.classes.map(c => `<button class="check ${c.id === P.classeId ? 'on' : ''}" data-c="${c.id}"><span class="box">${c.id === P.classeId ? ICON.ok : ''}</span><b>${esc(c.nom)}</b></button>`).join('')}</section>` : ''}
  <section class="panel mx"><b class="ptitre">Nouvelle classe</b><label class="field"><input id="cNom" placeholder="Nom (ex. TS2 Spé PC)"></label><label class="field"><input id="cAn" value="2026-2027"></label><div class="btns"><button class="btn-sec plein" id="cCreer">Créer</button></div></section>`, 'reglages');
  document.getElementById('ren').onclick = async () => {
    const v = document.getElementById('nom').value.trim(); if (!v) return;
    const { error } = await sb.from('classes').update({ nom: v }).eq('id', cl.id); if (error) return toast('Enregistrement impossible.');
    cl.nom = v; toast('Classe renommée.');
  };
  APP.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => { P.classeId = b.dataset.c; localStorage.setItem('pclab_prof_classe', P.classeId); P.el = null; await vRegClasse(); });
  document.getElementById('cCreer').onclick = creerClasse;
}

/* ---------- routeur prof ---------- */
ROUTES.prof = async (sous, a, b) => {
  if (!S.prof) { location.hash = '#/accueil'; return; }
  if (!P.classes.length) await chargerClasses();
  if (!P.classeId && sous !== undefined) return vProfBienvenue();
  switch (sous) {
    case 'groupe': return vProfGroupe();
    case 'eleves': return vProfEleves(a);
    case 'eleve': return vProfEleve(a);
    case 'chapitres': return vProfChapitres();
    case 'chapitre': return vProfChapitre(a);
    case 'projection': return vProfProjection(a, b);
    case 'reglages': return vProfReglages(a);
    default: return vProfAccueil();
  }
};
