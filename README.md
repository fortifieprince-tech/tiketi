# CongoTickets 🎟️

Plateforme de billetterie en ligne pour Congo-Brazzaville et Pointe-Noire.

## Stack technique

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** v3
- **Lucide React** (icônes)
- Police **Plus Jakarta Sans** (Google Fonts)

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en développement
npm run dev

# 3. Ouvrir dans le navigateur
# http://localhost:3000
```

## Structure des fichiers

```
congoticketsv2/
├── app/
│   ├── layout.tsx              # Layout racine + fonts
│   ├── globals.css             # Styles globaux Tailwind
│   ├── page.tsx                # 🏠 Accueil — liste des événements
│   ├── not-found.tsx           # Page 404
│   ├── event/[id]/page.tsx     # 🎟️ Détail événement + formulaire achat
│   └── admin/
│       ├── login/page.tsx      # 🔐 Connexion organisateur
│       └── register/page.tsx   # 📝 Inscription organisateur
├── components/
│   ├── Navbar.tsx              # Navigation sticky
│   └── EventCard.tsx           # Carte d'événement
├── lib/
│   └── events.ts               # Données des événements (en dur)
├── tailwind.config.ts
├── next.config.js
└── tsconfig.json
```

## Pages

| Route | Description |
|---|---|
| `/` | Accueil avec recherche, filtres par catégorie/ville, grille d'événements |
| `/event/[id]` | Détail d'un événement avec sélecteur de quantité, formulaire, total auto |
| `/admin/login` | Connexion organisateur (démo: demo@congoticketsv2.cg / demo1234) |
| `/admin/register` | Inscription avec validation et indicateur de force du mot de passe |

## Prochaines étapes

1. **Paiement** — Intégrer l'API CinetPay (MTN Congo + Airtel Congo)
2. **Base de données** — Remplacer les données en dur par Supabase ou PlanetScale
3. **Auth** — Ajouter NextAuth.js pour l'espace organisateur
4. **Dashboard** — Créer `/admin/dashboard` avec stats et gestion des événements
5. **QR Code** — Intégrer `qrcode.react` pour les billets numériques
6. **Scanner** — Page de scan QR code pour les agents à l'entrée

## Personnalisation

Les événements sont dans `lib/events.ts`. Pour ajouter un événement :

```ts
{
  id: '9',
  title: 'Mon nouvel événement',
  date: '1 septembre 2025',
  time: '20h00',
  venue: 'Espace Culturel',
  city: 'Brazzaville',
  category: 'Concert',
  price: 5000,
  capacity: 300,
  sold: 0,
  description: 'Description de l\'événement...',
  gradient: 'from-blue-600 to-indigo-700',
  icon: '🎵',
}
```
