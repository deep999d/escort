export interface MockProvider {
  id: string;
  display_name: string;
  age: number;
  city: string;
  neighborhood: string;
  price_min: number;
  price_max: number;
  price_currency: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_premium: boolean;
  tagline: string;
  languages: string[];
  response_min: number;
  reliability_percent: number;
  available_now: boolean;
  services: string[];
  /** Mock photo URL; when privacy is off, show this; when on, blur it */
  image_url: string;
}

export const MOCK_PROVIDERS: MockProvider[] = [
  {
    id: "m1",
    display_name: "Carmen",
    age: 31,
    city: "Barcelona",
    neighborhood: "Gracia",
    price_min: 300,
    price_max: 700,
    price_currency: "EUR",
    rating: 5,
    review_count: 89,
    is_verified: true,
    is_premium: true,
    tagline: "Sophistication with a touch of fire",
    languages: ["Spanish", "Catalan", "English", "Portuguese"],
    response_min: 8,
    reliability_percent: 99,
    available_now: true,
    services: ["Dinner Companion", "Cultural Guide", "Nightlife"],
    image_url: "https://picsum.photos/seed/carmen31/400/500",
  },
  {
    id: "m2",
    display_name: "Isabella",
    age: 29,
    city: "Barcelona",
    neighborhood: "Gothic Quarter",
    price_min: 250,
    price_max: 600,
    price_currency: "EUR",
    rating: 4.8,
    review_count: 63,
    is_verified: true,
    is_premium: true,
    tagline: "Your confidante in the city of dreams",
    languages: ["Spanish", "English", "Catalan"],
    response_min: 12,
    reliability_percent: 98,
    available_now: true,
    services: ["Event Companion", "City Guide", "Travel Companion"],
    image_url: "https://picsum.photos/seed/isabella29/400/500",
  },
  {
    id: "m3",
    display_name: "Valentina",
    age: 26,
    city: "Barcelona",
    neighborhood: "Eixample",
    price_min: 200,
    price_max: 500,
    price_currency: "EUR",
    rating: 4.9,
    review_count: 47,
    is_verified: true,
    is_premium: false,
    tagline: "Elegant companion for unforgettable evenings",
    languages: ["Spanish", "Catalan", "English"],
    response_min: 5,
    reliability_percent: 99,
    available_now: true,
    services: ["Dinner Companion", "Wine Tasting", "Weekend Getaway"],
    image_url: "https://picsum.photos/seed/valentina26/400/500",
  },
  {
    id: "m4",
    display_name: "Sofia",
    age: 28,
    city: "Barcelona",
    neighborhood: "El Born",
    price_min: 280,
    price_max: 650,
    price_currency: "EUR",
    rating: 4.7,
    review_count: 34,
    is_verified: true,
    is_premium: false,
    tagline: "Warm, discreet, culturally curious",
    languages: ["Spanish", "English", "French"],
    response_min: 15,
    reliability_percent: 97,
    available_now: false,
    services: ["Cultural Experience", "Architecture Tour", "Shopping"],
    image_url: "https://picsum.photos/seed/sofia28/400/500",
  },
  {
    id: "m5",
    display_name: "Elena",
    age: 33,
    city: "Barcelona",
    neighborhood: "Sarrià",
    price_min: 350,
    price_max: 800,
    price_currency: "EUR",
    rating: 5,
    review_count: 72,
    is_verified: true,
    is_premium: true,
    tagline: "Refined elegance, unforgettable moments",
    languages: ["Spanish", "Catalan", "English", "Italian"],
    response_min: 6,
    reliability_percent: 99,
    available_now: true,
    services: ["Dinner Companion", "Event Companion", "Travel Companion"],
    image_url: "https://picsum.photos/seed/elena33/400/500",
  },
  {
    id: "m6",
    display_name: "Maria",
    age: 27,
    city: "Barcelona",
    neighborhood: "Raval",
    price_min: 220,
    price_max: 480,
    price_currency: "EUR",
    rating: 4.6,
    review_count: 41,
    is_verified: true,
    is_premium: false,
    tagline: "Art, culture, and great conversation",
    languages: ["Spanish", "English"],
    response_min: 18,
    reliability_percent: 96,
    available_now: true,
    services: ["City Guide", "Cultural Experience", "Beach Day"],
    image_url: "https://picsum.photos/seed/maria27/400/500",
  },
];
