import { Wifi, Car, Coffee, Waves, Mountain } from 'lucide-react';

export const accommodations = [
  {
    id: 1,
    title: "Luxury Beachfront Villa",
    location: "Malibu, CA",
    price: 450,
    rating: 4.9,
    reviews: 127,
    host: "Sarah Thompson",
    hostImage: "https://images.unsplash.com/photo-1494790108755-2616b332e234?auto=format&fit=crop&w=100&q=80",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582063289852-62e3ba2747f8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      { icon: Wifi, name: "Free WiFi", available: true },
      { icon: Car, name: "Free parking", available: true },
      { icon: Coffee, name: "Kitchen", available: true },
      { icon: Waves, name: "Beachfront", available: true },
      { icon: Mountain, name: "Ocean view", available: true }
    ],
    description: "Experience the ultimate luxury getaway in this stunning beachfront villa. Wake up to panoramic ocean views, enjoy private beach access, and relax in the infinity pool overlooking the Pacific. Perfect for romantic retreats or family vacations.",
    bedrooms: 5,
    bathrooms: 4,
    maxGuests: 10,
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    features: ["Ocean View", "Private Pool", "5 Bedrooms", "WiFi"]
  },
  {
    id: 2,
    title: "Cozy Mountain Cabin",
    location: "Aspen, CO",
    price: 280,
    rating: 4.8,
    reviews: 89,
    host: "David Miller",
    hostImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80",
    images: [
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1501869154753-3e2e72b47ff7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1530731141654-5993c3016c77?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      { icon: Wifi, name: "Free WiFi", available: true },
      { icon: Car, name: "Free parking", available: true },
      { icon: Coffee, name: "Kitchen", available: true },
      { icon: Mountain, name: "Mountain View", available: true }
    ],
    description: "Nestled in the mountains, this cozy cabin is perfect for winter retreats or summer adventures. Enjoy the fireplace, hot tub, and serene views all year round.",
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    checkIn: "2:00 PM",
    checkOut: "10:00 AM",
    features: ["Mountain View", "Fireplace", "3 Bedrooms", "Hot Tub"]
  },
  {
    id: 3,
    title: "Modern City Loft",
    location: "New York, NY",
    price: 320,
    rating: 4.7,
    reviews: 156,
    host: "Jessica Lee",
    hostImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1473187983305-f615310e7daa?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1539699232453-7f3b4a1e84b8?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      { icon: Wifi, name: "Free WiFi", available: true },
      { icon: Car, name: "Parking available", available: true },
      { icon: Coffee, name: "Kitchen", available: true },
      { icon: Mountain, name: "City View", available: true }
    ],
    description: "Experience the hustle and bustle of NYC in this modern loft with rooftop access and all the amenities you need for a comfortable stay.",
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    features: ["City View", "Rooftop Access", "2 Bedrooms", "Gym"]
  },
  {
    id: 4,
    title: "Charming Country House",
    location: "Tuscany, Italy",
    price: 380,
    rating: 4.9,
    reviews: 203,
    host: "Marco Rossi",
    hostImage: "https://images.unsplash.com/photo-1531891437562-5ff8e1b1d4a2?auto=format&fit=crop&w=100&q=80",
    images: [
      "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1505691723518-22c1f98a35b1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      { icon: Wifi, name: "Free WiFi", available: true },
      { icon: Car, name: "Parking available", available: true },
      { icon: Coffee, name: "Kitchen", available: true },
      { icon: Mountain, name: "Vineyard View", available: true }
    ],
    description: "Relax in this charming country house surrounded by vineyards and gardens. Ideal for families or groups looking for a peaceful retreat in Tuscany.",
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    features: ["Vineyard View", "Garden", "4 Bedrooms", "Kitchen"]
  }
];
