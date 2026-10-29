# GYMBROS 💪

Webapp mobile (installable sur l'écran d'accueil) pour tracker calories et protéines en prenant ses repas en photo, entre potes.

- **Snap** : photo du plat (+ précision texte optionnelle), l'IA (Claude) estime chaque aliment, kcal et protéines. Tu ajustes la portion (x0.5 à x2) ou corriges les chiffres avant d'enregistrer. Saisie manuelle possible sans IA.
- **Today** : anneaux calories / protéines vs objectifs, liste des repas du jour avec photos, navigation jour par jour.
- **Squad** : classement du jour entre potes, au % de l'objectif protéines. Seuls les totaux sont partagés, pas les photos ni le détail des repas.
- **Me** : objectifs, historique 7 jours.
- Comptes email + mot de passe, inscription protégée par un code d'invitation.

Stack : Next.js 16, Supabase (auth, Postgres, stockage photos privé), API Claude, déploiement Vercel.

## Limites à connaître

- L'estimation sur photo reste approximative (portions, huile, sauces). La précision texte ("200 g de poulet") et l'ajustement de portion comptent beaucoup.
- Chaque scan est un appel API payant. Plafond par utilisateur sur 24 h : `NEXT_PUBLIC_DAILY_AI_LIMIT` (25 par défaut).
- Le Squad affiche tous les inscrits : avec le code d'invitation, ce sont tes potes.

## Mise en route

### 1. Supabase
1. Créer un projet sur supabase.com.
2. SQL Editor > New query > coller `supabase/schema.sql` > Run.
3. Authentication > URL Configuration : URL du site (ex. `https://gymbros.vercel.app`) dans Site URL, et `https://<ton-domaine>/auth/callback` dans Redirect URLs.
4. Optionnel : Authentication > Providers > Email, désactiver "Confirm email" pour que tes potes entrent sans mail de confirmation.
5. Project Settings > API : récupérer l'URL et la clé `anon`.

### 2. Clé Anthropic
Créer une clé sur console.anthropic.com (avec du crédit).

### 3. Variables d'environnement
Copier `.env.example` en `.env.local` et remplir. Sur Vercel, mêmes variables dans Project Settings > Environment Variables.

### 4. Lancer en local
```bash
npm install
npm run dev
```

### 5. Déployer
Importer le repo sur vercel.com, ajouter les variables, déployer. Envoyer l'URL et le code d'invitation aux potes. Sur iPhone : Safari > Partager > "Sur l'écran d'accueil".

## Google Sign-In (plus tard)
Supabase > Authentication > Providers > Google, coller les identifiants OAuth Google. La route `/auth/callback` est déjà en place, il restera à ajouter un bouton qui appelle `supabase.auth.signInWithOAuth({ provider: "google" })` sur la page de login.
