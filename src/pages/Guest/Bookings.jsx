import React from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Calendar, MapPin, Users, MessageSquare, Star } from "lucide-react";

const Bookings = () => {
  const upcomingBookings = [
    {
      id: 1,
      type: "Accommodation",
      title: "Luxury Beachfront Villa",
      location: "Bali, Indonesia",
      image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800",
      checkIn: "2025-11-15",
      checkOut: "2025-11-22",
      guests: 4,
      price: 2800,
      status: "Confirmed",
      host: "Sarah Johnson"
    },
    {
      id: 2,
      type: "Experience",
      title: "Sunset Sailing Adventure",
      location: "Santorini, Greece",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      date: "2025-11-18",
      time: "6:00 PM",
      guests: 2,
      price: 180,
      status: "Confirmed",
      host: "Dimitris Papadopoulos"
    }
  ];

  const pastBookings = [
    {
      id: 3,
      type: "Service",
      title: "Private Chef Experience",
      location: "Paris, France",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
      date: "2025-08-10",
      guests: 6,
      price: 450,
      status: "Completed",
      host: "Pierre Dubois",
      rating: 5
    },
    {
      id: 4,
      type: "Accommodation",
      title: "Mountain Cabin Retreat",
      location: "Swiss Alps, Switzerland",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      checkIn: "2025-07-01",
      checkOut: "2025-07-07",
      guests: 2,
      price: 1200,
      status: "Completed",
      host: "Hans Mueller",
      rating: 5
    }
  ];

  const cancelledBookings = [
    {
      id: 5,
      type: "Accommodation",
      title: "City Loft Apartment",
      location: "New York, USA",
      image: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800",
      checkIn: "2025-09-15",
      checkOut: "2025-09-20",
      guests: 2,
      price: 800,
      status: "Cancelled",
      cancelledDate: "2025-08-20"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-36 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Your Bookings</h1>
          <p className="text-muted-foreground">Manage and view all your reservations</p>
        </div>

        {/* Upcoming Bookings */}
        <section className="space-y-6">
          {upcomingBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-2xl shadow p-6">
              <div className="grid md:grid-cols-[300px,1fr] gap-6">
                <img
                  src={booking.image}
                  alt={booking.title}
                  className="w-full h-64 md:h-full object-cover rounded-xl"
                />
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">{booking.type}</span>
                      <h3 className="text-2xl font-semibold mt-2">{booking.title}</h3>
                      <p className="text-gray-500 flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {booking.location}
                      </p>
                    </div>
                    <span className="text-sm bg-green-500 text-white px-3 py-1 rounded-full">
                      {booking.status}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                    {booking.checkIn && (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>Check-in: {booking.checkIn}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>Check-out: {booking.checkOut}</span>
                        </div>
                      </>
                    )}
                    {booking.date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{booking.date} at {booking.time}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{booking.guests} guests</span>
                    </div>
                  </div>

                  <div className="flex justify-between border-t pt-4">
                    <div>
                      <p className="text-sm text-gray-500">Hosted by</p>
                      <p className="font-medium">{booking.host}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total price</p>
                      <p className="text-2xl font-bold">${booking.price}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message Host
                    </button>
                    <button className="btn-outline flex-1">View Details</button>
                    <button className="btn-outline">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Bookings;
