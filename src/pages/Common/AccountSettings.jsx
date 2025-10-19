import React, { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { User, Calendar, MapPin, Heart, Phone, Shield, CreditCard, Trash2 } from "lucide-react";

const AccountSettings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [notifications, setNotifications] = useState({
    bookings: true,
    promotions: false,
    reminders: true,
    messages: true
  });

  const handleSaveProfile = () => {
    alert("Profile updated successfully!");
  };

  const wishlistItems = [
    {
      id: 1,
      title: "Luxury Beachfront Villa",
      location: "Bali, Indonesia",
      image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800",
      price: 400,
      type: "Accommodation"
    },
    {
      id: 2,
      title: "Sunset Sailing Adventure",
      location: "Santorini, Greece",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      price: 90,
      type: "Experience"
    },
    {
      id: 3,
      title: "Private Chef Experience",
      location: "Paris, France",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
      price: 75,
      type: "Service"
    }
  ];

  const upcomingBookings = [
    {
      id: 1,
      title: "Luxury Beachfront Villa",
      location: "Bali, Indonesia",
      image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800",
      checkIn: "2025-11-15",
      checkOut: "2025-11-22",
      status: "Confirmed"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-36 pb-20 px-4 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile, bookings, and preferences</p>
        </div>

        {/* Simple Tabs */}
        <div className="grid grid-cols-3 mb-8 border-b">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 text-center font-medium border-b-2 ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500"
            }`}
          >
            <User className="inline w-4 h-4 mr-1" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`py-3 text-center font-medium border-b-2 ${
              activeTab === "bookings"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500"
            }`}
          >
            <Calendar className="inline w-4 h-4 mr-1" />
            Bookings
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`py-3 text-center font-medium border-b-2 ${
              activeTab === "wishlist"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500"
            }`}
          >
            <Heart className="inline w-4 h-4 mr-1" />
            Wishlist
          </button>
        </div>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow space-y-6">
              <h2 className="text-xl font-semibold">Personal Information</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-1">First Name</label>
                  <input className="w-full border rounded p-2" defaultValue="John" />
                </div>
                <div>
                  <label className="block mb-1">Last Name</label>
                  <input className="w-full border rounded p-2" defaultValue="Doe" />
                </div>
                <div>
                  <label className="block mb-1">Email</label>
                  <input className="w-full border rounded p-2" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div>
                  <label className="block mb-1">Phone</label>
                  <input className="w-full border rounded p-2" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>
              </div>

              <div>
                <label className="block mb-1">Bio</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows="4"
                  defaultValue="Travel enthusiast exploring the world one destination at a time."
                />
              </div>

              <div>
                <label className="block mb-1">Location</label>
                <input className="w-full border rounded p-2" defaultValue="San Francisco, USA" />
              </div>

              <button onClick={handleSaveProfile} className="bg-primary text-white px-4 py-2 rounded">
                Save Changes
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="text-xl font-semibold">Notification Preferences</h2>
              {Object.keys(notifications).map((key) => (
                <div key={key} className="flex items-center justify-between border-b py-2">
                  <span className="capitalize">{key}</span>
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) =>
                      setNotifications({ ...notifications, [key]: e.target.checked })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="text-xl font-semibold">Security</h2>
              <button className="border px-4 py-2 rounded flex items-center gap-2 w-full md:w-auto">
                <Shield className="w-4 h-4" /> Change Password
              </button>
              <button className="border px-4 py-2 rounded flex items-center gap-2 w-full md:w-auto">
                <Phone className="w-4 h-4" /> Enable Two-Factor Authentication
              </button>
            </div>

            <div className="bg-red-50 p-6 rounded-xl shadow">
              <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
              <button className="bg-red-600 text-white px-4 py-2 rounded mt-4 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete Account
              </button>
            </div>
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-semibold mb-4">Upcoming Bookings</h2>
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((b) => (
                  <div key={b.id} className="flex gap-4 border p-4 rounded-lg mb-4">
                    <img src={b.image} alt={b.title} className="w-32 h-32 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{b.title}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {b.location}
                      </p>
                      <p className="text-sm mt-1">
                        {b.checkIn} → {b.checkOut}
                      </p>
                      <p className="text-green-600 text-sm font-medium mt-1">{b.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No upcoming bookings</p>
              )}
            </div>
          </div>
        )}

        {/* WISHLIST TAB */}
        {activeTab === "wishlist" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow hover:shadow-lg transition p-4">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {item.location}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold">${item.price}/night</span>
                  <button className="border px-3 py-1 rounded text-sm">View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AccountSettings;
