# Mise en ligne du site — 3 étapes

## Étape 1 — Dernier script SQL (2 min)
Dans Supabase → **SQL Editor** → New query → collez tout le contenu de
`patch_v1_2.sql` → **Run**. (Il branche l'authentification des élèves et
les fonctions du site. À faire APRÈS schema.sql et items_seed.sql.)

## Étape 2 — Un réglage dans Supabase (1 min)
Menu **Authentication → Sign In / Providers → Email** :
désactivez l'option **« Confirm email »** puis enregistrez.
(Les comptes élèves utilisent des adresses internes qui ne reçoivent pas
d'emails — sans ce réglage, la création des comptes échouera.)

## Étape 3 — Mise en ligne (5 min)
1. Créez un compte gratuit sur **netlify.com**.
2. Une fois connecté : page **https://app.netlify.com/drop**
3. Glissez-déposez le dossier **site/** entier (les 4 fichiers) sur la page.
4. Netlify vous donne une adresse du type `https://nom-aleatoire.netlify.app`
   — renommable dans Site settings → Change site name (ex. `revisions-tspc`).

## Ensuite, votre première prise en main
1. Ouvrez `votre-adresse.netlify.app/admin.html`
2. **Créer mon compte prof** (votre email + un mot de passe solide).
3. La page vous affichera un petit SQL de promotion administrateur :
   copiez-le dans le SQL Editor de Supabase, exécutez, rechargez la page.
4. Créez votre classe (nom, dosage des séances).
5. **Activez les chapitres** déjà traités en classe.
6. **Générez les comptes élèves** (préfixe + nombre) → la liste
   identifiants + codes s'affiche UNE SEULE FOIS → bouton Imprimer.
7. Donnez aux élèves : l'adresse du site + leur identifiant + leur code.

## Ce que contient cette version (v1)
- Connexion élève (identifiant + code), accueil à 3 entrées
- Révision du jour (dosage fixé par vous, 1 fois par jour)
- Révisions spéciales : QCM / Cartes / Les deux, par chapitre ou
  notions à consolider, illimitées
- Écran Notions filtrable (niveau + chapitre)
- Correction côté serveur (les corrigés ne transitent jamais avant la réponse)
- Mélange aléatoire des options à chaque affichage
- Rendu des formules LaTeX (KaTeX) — prêt pour vos flashcards
- Moteur de mémorisation espacée par notion (invisible pour l'élève)

## Pas encore dans cette version (prochaines étapes)
- Importeur H5P (vos DialogCards et MultiChoice) → phase 2
- Images dans les questions → phase 2
- Tableau de bord professeur détaillé → phase 3
- Carnet d'erreurs, blocs Bac, multi-profs en interface → phases 3-4

En cas de problème à n'importe quelle étape : copiez le message d'erreur
exact (ou une capture d'écran) dans la conversation.
