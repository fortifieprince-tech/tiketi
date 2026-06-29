export type EventCategory = 'Concert' | 'Musique' | 'Culture' | 'Sport' | 'Soirée'

export interface Event {
  id: string
  title: string
  date: string
  time: string
  venue: string
  city: 'Brazzaville' | 'Pointe-Noire'
  category: EventCategory
  price: number
  capacity: number
  sold: number
  description: string
  gradient: string
  icon: string
}

export const EVENTS: Event[] = [
  {
    id: '1',
    title: 'Nuit Afrobeat — Brazzaville',
    date: '14 juin 2025',
    time: '21h00',
    venue: 'Espace Tati',
    city: 'Brazzaville',
    category: 'Concert',
    price: 5000,
    capacity: 450,
    sold: 312,
    description: "Une nuit inoubliable au rythme de l'Afrobeat avec les meilleurs artistes congolais et invités internationaux. Ambiance garantie, son live de qualité professionnelle.",
    gradient: 'from-blue-600 to-indigo-700',
    icon: '🎵',
  },
  {
    id: '2',
    title: 'Diables Rouges vs Léopards — Finale',
    date: '22 juin 2025',
    time: '17h00',
    venue: 'Stade Alphonse Massamba-Débat',
    city: 'Brazzaville',
    category: 'Sport',
    price: 3000,
    capacity: 1200,
    sold: 430,
    description: "Le choc tant attendu entre les Diables Rouges et les Léopards pour la finale du championnat national. Atmosphère électrique garantie dans le plus grand stade du Congo.",
    gradient: 'from-emerald-500 to-teal-700',
    icon: '⚽',
  },
  {
    id: '3',
    title: 'Festival du Théâtre Congolais',
    date: '4 juillet 2025',
    time: '19h00',
    venue: 'Centre Culturel Français',
    city: 'Brazzaville',
    category: 'Culture',
    price: 2500,
    capacity: 300,
    sold: 180,
    description: "Trois jours de théâtre, de danse et de performances artistiques par les meilleures troupes du Congo-Brazzaville. Un voyage au cœur de la culture congolaise.",
    gradient: 'from-orange-500 to-red-600',
    icon: '🎭',
  },
  {
    id: '4',
    title: 'Soirée Rumba — Club Océan',
    date: '28 juin 2025',
    time: '22h00',
    venue: 'Club Océan',
    city: 'Pointe-Noire',
    category: 'Soirée',
    price: 4000,
    capacity: 200,
    sold: 178,
    description: "La soirée Rumba la plus attendue de l'année à Pointe-Noire. Musique live, DJ sets, et une ambiance conviviale au bord de l'Atlantique.",
    gradient: 'from-pink-500 to-rose-700',
    icon: '🎉',
  },
  {
    id: '5',
    title: 'Gala Gospel — Église de la Grâce',
    date: '6 juillet 2025',
    time: '15h00',
    venue: 'Salle des Fêtes',
    city: 'Brazzaville',
    category: 'Musique',
    price: 0,
    capacity: 500,
    sold: 120,
    description: "Un gala gospel exceptionnel réunissant les plus belles voix chrétiennes de Brazzaville. Entrée libre, venez nombreux vivre une expérience spirituelle et musicale intense.",
    gradient: 'from-cyan-500 to-blue-700',
    icon: '🎤',
  },
  {
    id: '6',
    title: 'Tournoi de Boxe Nationale 2025',
    date: '19 juillet 2025',
    time: '18h00',
    venue: 'Palais des Sports',
    city: 'Pointe-Noire',
    category: 'Sport',
    price: 2000,
    capacity: 600,
    sold: 210,
    description: "Le tournoi national de boxe revient avec les meilleurs combattants du pays. Catégories amateurs et professionnels dans une soirée à couper le souffle.",
    gradient: 'from-violet-500 to-indigo-700',
    icon: '🏆',
  },
  {
    id: '7',
    title: 'Grand Concert Fête Nationale — 15 Août',
    date: '15 août 2025',
    time: '20h00',
    venue: 'Palais des Congrès',
    city: 'Brazzaville',
    category: 'Concert',
    price: 10000,
    capacity: 800,
    sold: 657,
    description: "Le concert de l'Indépendance réunit les plus grandes stars de la musique congolaise et africaine pour célébrer le 15 août dans une atmosphère de fête nationale.",
    gradient: 'from-blue-600 to-indigo-700',
    icon: '🎆',
  },
  {
    id: '8',
    title: 'Exposition Art Contemporain Congolais',
    date: '10 juillet 2025',
    time: '10h00',
    venue: 'Galerie Nationale',
    city: 'Brazzaville',
    category: 'Culture',
    price: 1500,
    capacity: 400,
    sold: 88,
    description: "Découvrez les œuvres de 30 artistes congolais contemporains dans cette exposition exceptionnelle. Peinture, sculpture, photographie et arts numériques à l'honneur.",
    gradient: 'from-orange-500 to-red-600',
    icon: '🎨',
  },
]

export const CATEGORIES: Array<'Tous' | EventCategory> = [
  'Tous', 'Concert', 'Musique', 'Culture', 'Sport', 'Soirée',
]

export function formatPrice(price: number): string {
  if (price === 0) return 'Gratuit'
  return price.toLocaleString('fr-FR') + ' XAF'
}

export function getEventById(id: string): Event | undefined {
  return EVENTS.find(e => e.id === id)
}
