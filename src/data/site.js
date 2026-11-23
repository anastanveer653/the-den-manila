// Business details for The Den.
// Source: thedenmanila.com and the cafe's Google listing. Edit here; the page reads from this file.

export const site = {
  name: 'The Den',
  tagline: 'Coffee and Contemporary Culture',
  legalName: 'Zeitgeist Coffee and Culture Corp',

  address: {
    venue: 'HUB Make Lab, First United Building',
    street: '413 Escolta St, Binondo',
    city: 'Manila, 1006 Metro Manila',
    country: 'Philippines',
    plusCode: 'HXXH+GQ Manila',
  },
  geo: { lat: 14.5988771, lng: 120.9795465 },

  phone: { label: '+63 2 7960 3650', href: 'tel:+63279603650' },
  email: 'hello@thedenmanila.com',

  links: {
    instagram: 'https://instagram.com/thedenmanila',
    instagramHandle: '@thedenmanila',
    beans: 'https://www.escoltacoffee.co/',
    directions: 'https://www.google.com/maps/dir/?api=1&destination=14.5988771,120.9795465',
    reviews: 'https://www.google.com/maps/search/?api=1&query=The+Den+HUB+Make+Lab+First+United+Building+Escolta+Manila',
  },

  // From the Google listing. Update when the numbers move.
  rating: { value: 4.7, count: 250, priceRange: '₱1–500 per person' },

  timeZone: 'Asia/Manila',

  // Index matches Date.getDay(): 0 = Sunday. Hours are 24h, local Manila time.
  hours: [
    { day: 'Sunday', open: 10, close: 19 },
    { day: 'Monday', open: 10, close: 18 },
    { day: 'Tuesday', open: 10, close: 18 },
    { day: 'Wednesday', open: 10, close: 18 },
    { day: 'Thursday', open: 10, close: 18 },
    { day: 'Friday', open: 10, close: 19 },
    { day: 'Saturday', open: 10, close: 19 },
  ],
};
