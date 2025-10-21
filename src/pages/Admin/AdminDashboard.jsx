import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Users, Home, Calendar, DollarSign, TrendingUp,
  Star, FileText, Shield, Settings, BarChart3,
  Eye, Download, Filter, Search
} from 'lucide-react';

const AdminDashboard = () => {
  const stats = [
    { icon: Users, label: "Total Users", value: "12,847", change: "+8.2%", trend: "up" },
    { icon: Home, label: "Active Listings", value: "3,456", change: "+12.5%", trend: "up" },
    { icon: Calendar, label: "Total Bookings", value: "8,923", change: "+15.3%", trend: "up" },
    { icon: DollarSign, label: "Revenue", value: "$2.1M", change: "+23.1%", trend: "up" }
  ];

  const recentBookings = [
    {
      id: "BK001",
      guest: "John Smith",
      listing: "Luxury Beachfront Villa",
      host: "Sarah Thompson",
      amount: 1350,
      status: "confirmed",
      date: "2024-03-15"
    },
    {
      id: "BK002",
      guest: "Emma Wilson",
      listing: "Cozy Mountain Cabin",
      host: "Mike Johnson",
      amount: 840,
      status: "pending",
      date: "2024-03-14"
    },
    {
      id: "BK003",
      guest: "David Chen",
      listing: "Modern City Loft",
      host: "Lisa Park",
      amount: 960,
      status: "confirmed",
      date: "2024-03-14"
    }
  ];

  const topHosts = [
    { name: "Sarah Thompson", earnings: "$12,450", rating: 4.9, properties: 3 },
    { name: "Mike Johnson", earnings: "$9,230", rating: 4.8, properties: 2 },
    { name: "Lisa Park", earnings: "$8,760", rating: 4.9, properties: 4 }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
                  Admin Dashboard
                </h1>
                <p className="font-body text-xl text-muted-foreground">
                  Manage your Getaways platform with comprehensive insights and controls
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button className="btn-outline flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
                <button className="btn-primary flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="max-w-7xl mx-auto px-6 -mt-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="card-listing p-6 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    <TrendingUp className="w-4 h-4" />
                    {stat.change}
                  </div>
                </div>
                <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </h3>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Recent Bookings */}
          <div className="lg:col-span-2 card-listing p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Recent Bookings</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Search className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-foreground">{booking.guest}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{booking.listing}</p>
                    <p className="text-xs text-muted-foreground">Host: {booking.host}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-lg font-bold text-foreground">${booking.amount}</p>
                    <p className="text-xs text-muted-foreground">{booking.date}</p>
                  </div>
                  <button className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button className="btn-outline">View All Bookings</button>
            </div>
          </div>

          {/* Top Hosts */}
          <div className="card-listing p-6">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Top Hosts</h2>

            <div className="space-y-4">
              {topHosts.map((host, index) => (
                <div key={host.name} className="flex items-center gap-4 p-4 border border-border rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{host.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{host.rating}</span>
                      <span>•</span>
                      <span>{host.properties} properties</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{host.earnings}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Quick Actions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button className="card-listing p-6 hover-lift cursor-pointer text-left">
              <Users className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">User Management</h3>
              <p className="text-sm text-muted-foreground">Manage users, hosts, and guest accounts</p>
            </button>

            <button className="card-listing p-6 hover-lift cursor-pointer text-left">
              <FileText className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Reports</h3>
              <p className="text-sm text-muted-foreground">Generate detailed analytics reports</p>
            </button>

            <button className="card-listing p-6 hover-lift cursor-pointer text-left">
              <Shield className="w-8 h-8 text-secondary mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Compliance</h3>
              <p className="text-sm text-muted-foreground">Review policies and manage compliance</p>
            </button>

            <button className="card-listing p-6 hover-lift cursor-pointer text-left">
              <BarChart3 className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Analytics</h3>
              <p className="text-sm text-muted-foreground">Deep dive into platform analytics</p>
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;