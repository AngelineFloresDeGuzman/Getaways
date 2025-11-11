import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
    const footerSections = [
        {
            title: 'Explore',
            links: [
                { label: 'Accommodations', to: '/accommodations', external: false },
                { label: 'Services', to: '/services', external: false },
                { label: 'Experiences', to: '/experiences', external: false },
                { label: 'Bookings', to: '/bookings', external: false },
                { label: 'Favorites', to: '/favorites', external: false }
            ]
        },
        {
            title: 'Hosting',
            links: [
                { label: 'Become a Host', to: '/pages/hostingsteps', external: false },
                { label: 'Host Resources', to: '/host/resources', external: false },
                { label: 'Host Dashboard', to: '/host/hostdashboard', external: false },
                { label: 'Host Policies', to: '/host/policies', external: false },
                { label: 'Find a Co-host', to: '/find-cohost', external: false }
            ]
        },
        {
            title: 'Support',
            links: [
                { label: 'Help Center', to: '/help', external: false },
                { label: 'Policies & Guidelines', to: '/guest/policies', external: false },
                { label: 'Contact Support', to: '/help', external: false }
            ]
        },
        {
            title: 'Company',
            links: [
                { label: 'Account Settings', to: '/accountsettings', external: false },
                { label: 'GetPay', to: '/ewallet', external: false },
                { label: 'Refer & Earn', to: '/refer', external: false }
            ]
        }
    ];

    const socialLinks = [
        { icon: Facebook, href: 'https://facebook.com/getaways', label: 'Facebook', external: true },
        { icon: Twitter, href: 'https://twitter.com/getaways', label: 'Twitter', external: true },
        { icon: Instagram, href: 'https://instagram.com/getaways', label: 'Instagram', external: true },
        { icon: Youtube, href: 'https://youtube.com/getaways', label: 'YouTube', external: true }
    ];

    const contactInfo = {
        email: 'admin@getaways.com',
        phone: '+63 906-707-1976',
        location: 'Bulacan, Philippines'
    };

    return (
        <footer className="pt-36 pb-8 bg-background">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
                    {/* Brand Section */}
                    <div className="lg:col-span-2">
                        <img src="/logo.jpg" alt="Getaways Logo" className="w-8 h-8 mb-4" />
                        <h2 className="font-heading text-3xl font-bold text-primary mb-4">
                            Getaways
                        </h2>
                        <p className="font-body text-muted-foreground mb-6 leading-relaxed">
                            Your trusted platform for discovering unique accommodations, exceptional services, and unforgettable experiences around the world.
                        </p>
                        
                        {/* Contact Information */}
                        <div className="space-y-3 mb-6">
                            <a 
                                href={`mailto:${contactInfo.email}`}
                                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Mail className="w-4 h-4 text-primary" />
                                <span className="font-body text-sm">{contactInfo.email}</span>
                            </a>
                            <a 
                                href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Phone className="w-4 h-4 text-primary" />
                                <span className="font-body text-sm">{contactInfo.phone}</span>
                            </a>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="font-body text-sm">{contactInfo.location}</span>
                            </div>
                        </div>
                        
                        {/* Social Links */}
                        <div className="flex gap-3">
                            {socialLinks.map((social) => {
                        const IconComponent = social.icon;
                                return (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                        aria-label={social.label}
                                    >
                                        <IconComponent className="w-5 h-5" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Sections */}
                    {footerSections.map((section) => (
                        <div key={section.title} className="lg:col-span-1">
                            <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                            <ul className="space-y-3">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        {link.external ? (
                                            <a
                                                href={link.to}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-body text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link
                                                to={link.to}
                                                className="font-body text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Newsletter Section */}
                <div className="border-t border-border pt-8 mb-8">
                    <div className="max-w-lg mx-auto text-center">
                        <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                            Stay Updated
                        </h3>
                        <p className="font-body text-muted-foreground mb-6">
                            Get the latest deals and travel inspiration delivered to your inbox
                        </p>
                        <div className="flex gap-3">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="input-field flex-1"
                            />
                            <button className="btn-primary px-6">
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>

                {/* Copyright & Legal Links */}
                <div className="border-t border-border pt-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <p className="font-body text-muted-foreground text-center md:text-left">
                            © 2025 Getaways. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
