import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  User, Mail, Phone, MapPin, Calendar, Camera,
  Star, Heart, Settings, Lock, Bell, CreditCard,
  Edit3, Save, X
} from 'lucide-react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState({
    name: "Sarah Thompson",
    email: "sarah.thompson@email.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    joinDate: "Member since March 2020",
    bio: "Travel enthusiast and experienced host who loves sharing the beauty of California with guests from around the world.",
    profileImage: "https://images.unsplash.com/photo-1494790108755-2616b332e234?auto=format&fit=crop&w=300&q=80"
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payment', label: 'Payment', icon: CreditCard }
  ];

  const stats = [
    { label: "Reviews", value: "127", icon: Star },
    { label: "Favorites", value: "23", icon: Heart },
    { label: "Bookings", value: "45", icon: Calendar }
  ];

  const handleSave = () => {
    setIsEditing(false);
    // Save profile logic here
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <img
            src={profile.profileImage}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
          />
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="font-heading text-2xl font-bold text-foreground">{profile.name}</h2>
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium text-foreground">4.9</span>
            </div>
          </div>
          <p className="text-muted-foreground mb-2">{profile.joinDate}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {profile.location}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-outline flex items-center gap-2"
        >
          {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!isEditing}
              className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''
                }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={!isEditing}
              className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''
                }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              disabled={!isEditing}
              className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''
                }`}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              disabled={!isEditing}
              className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''
                }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              disabled={!isEditing}
              rows={4}
              className={`w-full p-3 border border-border rounded-xl bg-background text-foreground resize-none ${!isEditing ? 'opacity-60' : ''
                }`}
            />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-4">
          <button
            onClick={() => setIsEditing(false)}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <h3 className="font-heading text-xl font-semibold text-foreground">Notification Preferences</h3>

      <div className="space-y-4">
        {[
          { label: "Booking confirmations", desc: "Get notified when bookings are confirmed" },
          { label: "New messages", desc: "Receive alerts for new guest messages" },
          { label: "Reviews received", desc: "Know when guests leave reviews" },
          { label: "Payment updates", desc: "Get notified about payment status" },
          { label: "Marketing emails", desc: "Receive promotional content and tips" }
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 border border-border rounded-xl">
            <div>
              <p className="font-medium text-foreground">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
            <input type="checkbox" className="w-5 h-5 text-primary" defaultChecked />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
              My Profile
            </h1>
            <p className="font-body text-xl text-muted-foreground">
              Manage your account settings and personal information
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto px-6 -mt-8 mb-12">
          <div className="grid grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="card-listing p-6 text-center animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-heading text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="card-listing p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="card-listing p-8">
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'notifications' && renderNotificationsTab()}
                {activeTab === 'preferences' && (
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Preferences</h3>
                    <p className="text-muted-foreground">Manage your account preferences and settings</p>
                  </div>
                )}
                {activeTab === 'security' && (
                  <div className="text-center py-12">
                    <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Security</h3>
                    <p className="text-muted-foreground">Manage your password and security settings</p>
                  </div>
                )}
                {activeTab === 'payment' && (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Payment Methods</h3>
                    <p className="text-muted-foreground">Manage your payment methods and billing information</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;