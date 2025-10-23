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

export const experiences = [
  {
    id: 1,
    title: "Sunset Hot Air Balloon Ride",
    host: "Sky Adventures",
    location: "Napa Valley, CA",
    price: 280,
    duration: "3 hours",
    groupSize: "Up to 8 people",
    rating: 4.9,
    reviews: 234,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    category: "Adventure",
    description: "Soar above the stunning vineyards of Napa Valley at sunset for a once-in-a-lifetime experience. Champagne toast included!",
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: [
      { id: 1, author: "John D.", date: "May 2024", rating: 5, comment: "Absolutely magical ride!", avatar: "https://randomuser.me/api/portraits/men/11.jpg" },
      { id: 2, author: "Emily R.", date: "April 2024", rating: 5, comment: "The best experience in Napa!", avatar: "https://randomuser.me/api/portraits/women/44.jpg" }
    ]
  },
  {
    id: 2,
    title: "Wine Tasting & Vineyard Tour",
    host: "Vine & Dine Tours",
    location: "Tuscany, Italy",
    price: 95,
    duration: "4 hours",
    groupSize: "Up to 12 people",
    rating: 4.8,
    reviews: 187,
    image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    category: "Food & Drink",
    description: "Taste the best wines of Tuscany and enjoy a scenic walk through picturesque vineyards.",
    images: [
      "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1510626176961-4b37d0b9b1f4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1510626176961-4b37d0b9b1f4?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: []
  },
  {
    id: 3,
    title: "Island Escape & Snorkeling Adventure",
    host: "Blue Horizon Travel",
    location: "Cebu, Philippines",
    price: 120,
    duration: "5 hours",
    groupSize: "Up to 10 people",
    rating: 4.7,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    category: "Adventure",
    description: "Enjoy a tropical escape exploring coral reefs and crystal-clear waters on this all-day snorkeling tour.",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: []
  },
  {
    id: 4,
    title: "City Night Lights Walking Tour",
    host: "Urban Discovery",
    location: "Tokyo, Japan",
    price: 60,
    duration: "2 hours",
    groupSize: "Up to 15 people",
    rating: 4.6,
    reviews: 142,
    image: "https://images.unsplash.com/photo-1516542076529-1ea3854896e1?auto=format&fit=crop&w=800&q=80",
    category: "Culture",
    description: "Experience the vibrant energy of Tokyo’s cityscape by night with a local guide.",
    images: [
      "https://images.unsplash.com/photo-1516542076529-1ea3854896e1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1516542076529-1ea3854896e1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1516542076529-1ea3854896e1?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: []
  }
];

export const services = [
  {
    id: 1,
    title: "Luxury Spa Treatment",
    host: "Serenity Spa",
    location: "Bali, Indonesia",
    price: 150,
    duration: "2 hours",
    groupSize: "Up to 2 people",
    rating: 4.9,
    reviews: 325,
    image: "https://images.unsplash.com/photo-1617196032811-df5e16d85a4b?auto=format&fit=crop&w=800&q=80",
    category: "Wellness",
    description: "Experience total relaxation with our premium full-body massage and aromatherapy session in a serene tropical setting.",
    images: [
      "https://images.unsplash.com/photo-1617196032811-df5e16d85a4b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1584466977777-2236c8ec3107?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: [
      { id: 1, author: "Anna M.", date: "July 2024", rating: 5, comment: "The best spa experience I've ever had!", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
      { id: 2, author: "Jason K.", date: "June 2024", rating: 5, comment: "Truly relaxing and professional staff.", avatar: "https://randomuser.me/api/portraits/men/24.jpg" }
    ]
  },
  {
    id: 2,
    title: "Private Chef Dining Experience",
    host: "Gourmet at Home",
    location: "Paris, France",
    price: 250,
    duration: "3 hours",
    groupSize: "Up to 6 people",
    rating: 4.8,
    reviews: 210,
    image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80",
    category: "Food & Drink",
    description: "Enjoy a five-course meal prepared by a private chef right in your accommodation — perfect for special occasions.",
    images: [
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: []
  },
  {
    id: 3,
    title: "Personal Yoga Session",
    host: "ZenWell",
    location: "Chiang Mai, Thailand",
    price: 90,
    duration: "1.5 hours",
    groupSize: "Up to 4 people",
    rating: 4.7,
    reviews: 142,
    image: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=800&q=80",
    category: "Fitness",
    description: "A guided private yoga session focusing on mindfulness, balance, and strength in a peaceful environment.",
    images: [
      "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1587049352838-456f7c1c91b6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1587049352838-456f7c1c91b6?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: []
  },
  {
    id: 4,
    title: "Luxury Airport Transfer",
    host: "Elite Travels",
    location: "Dubai, UAE",
    price: 120,
    duration: "45 minutes",
    groupSize: "Up to 3 people",
    rating: 4.8,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1588050892643-47b1e1c0f6f2?auto=format&fit=crop&w=800&q=80",
    category: "Transport",
    description: "Arrive in style with our private airport limousine service — comfort, elegance, and punctuality guaranteed.",
    images: [
      "https://images.unsplash.com/photo-1588050892643-47b1e1c0f6f2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1588050892643-47b1e1c0f6f2?auto=format&fit=crop&w=800&q=80"
    ],
    reviewsList: []
  }
];
