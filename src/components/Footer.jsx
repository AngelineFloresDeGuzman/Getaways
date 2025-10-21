import React from "react";

import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
const Footer = () => {
    const footerSections = [
        {
            title: 'Explore',
            links: [
                { label: 'Accommodations', href: '#accommodations' },
                { label: 'Services', href: '#services' },
                { label: 'Experiences', href: '#experiences' },
                { label: 'Featured Listings', href: '#featured' },
                { label: 'Popular Destinations', href: '#destinations' }
            ]
        },
        {
            title: 'Hosting',
            links: [
                { label: 'Become a Host', href: '#host' },
                { label: 'Host Resources', href: '#resources' },
                { label: 'Host Dashboard', href: '#dashboard' },
                { label: 'Pricing Tools', href: '#pricing' },
                { label: 'Host Community', href: '#community' }
            ]
        },
        {
            title: 'Support',
            links: [
                { label: 'Help Center', href: '#help' },
                { label: 'Safety Information', href: '#safety' },
                { label: 'Cancellation Policy', href: '#cancellation' },
                { label: 'Contact Us', href: '#contact' },
                { label: 'Trust & Safety', href: '#trust' }
            ]
        },
        {
            title: 'Company',
            links: [
                { label: 'About Getaways', href: '#about' },
                { label: 'Careers', href: '#careers' },
                { label: 'Press', href: '#press' },
                { label: 'Privacy Policy', href: '#privacy' },
                { label: 'Terms of Service', href: '#terms' }
            ]
        }
    ];
    const socialLinks = [
        { icon: Facebook, href: '#facebook', label: 'Facebook' },
        { icon: Twitter, href: '#twitter', label: 'Twitter' },
        { icon: Instagram, href: '#instagram', label: 'Instagram' },
        { icon: Youtube, href: '#youtube', label: 'YouTube' }
    ];
    return (React.createElement("footer", { className: "pt-36 pb-8" },
        React.createElement("div", { className: "max-w-7xl mx-auto px-6" },
            React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12" },
                React.createElement("div", { className: "lg:col-span-2" },
                    React.createElement("img", { src: "/logo.jpg", alt: "Getaways Logo", className: "w-8 h-8" }),
                    React.createElement("h2", { className: "font-heading text-3xl font-bold text-primary mb-4" }, "Getaways"),
                    React.createElement("p", { className: "font-body text-muted-foreground mb-6 leading-relaxed" }, "Your trusted platform for discovering unique accommodations, exceptional services, and unforgettable experiences around the world."),
                    React.createElement("div", { className: "space-y-3 mb-6" },
                        React.createElement("div", { className: "flex items-center gap-3 text-muted-foreground" },
                            React.createElement(Mail, { className: "w-4 h-4 text-primary" }),
                            React.createElement("span", { className: "font-body text-sm" }, "hello@getaways.com")),
                        React.createElement("div", { className: "flex items-center gap-3 text-muted-foreground" },
                            React.createElement(Phone, { className: "w-4 h-4 text-primary" }),
                            React.createElement("span", { className: "font-body text-sm" }, "+63 906-707-1976")),
                        React.createElement("div", { className: "flex items-center gap-3 text-muted-foreground" },
                            React.createElement(MapPin, { className: "w-4 h-4 text-primary" }),
                            React.createElement("span", { className: "font-body text-sm" }, "Bulacan, PH"))),
                    React.createElement("div", { className: "flex gap-3" }, socialLinks.map((social) => {
                        const IconComponent = social.icon;
                        return (React.createElement("a", { key: social.label, href: social.href, className: "p-2 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-300", "aria-label": social.label },
                            React.createElement(IconComponent, { className: "w-5 h-5" })));
                    }))),
                footerSections.map((section) => (React.createElement("div", { key: section.title, className: "lg:col-span-1" },
                    React.createElement("h3", { className: "font-heading text-lg font-semibold text-foreground mb-4" }, section.title),
                    React.createElement("ul", { className: "space-y-3" }, section.links.map((link) => (React.createElement("li", { key: link.label },
                        React.createElement("a", { href: link.href, className: "font-body text-muted-foreground hover:text-primary transition-colors" }, link.label))))))))),
            React.createElement("div", { className: "border-t border-border pt-8 mb-8" },
                React.createElement("div", { className: "max-w-lg mx-auto text-center" },
                    React.createElement("h3", { className: "font-heading text-xl font-semibold text-foreground mb-2" }, "Stay Updated"),
                    React.createElement("p", { className: "font-body text-muted-foreground mb-6" }, "Get the latest deals and travel inspiration delivered to your inbox"),
                    React.createElement("div", { className: "flex gap-3" },
                        React.createElement("input", { type: "email", placeholder: "Enter your email", className: "input-field flex-1" }),
                        React.createElement("button", { className: "btn-primary px-6" }, "Subscribe")))),
            React.createElement("div", { className: "border-t border-border pt-8" },
                React.createElement("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4" },
                    React.createElement("p", { className: "font-body text-muted-foreground text-center md:text-left" }, "\u00A9 2024 Getaways. All rights reserved."),
                    React.createElement("div", { className: "flex flex-wrap justify-center md:justify-end gap-6" },
                        React.createElement("a", { href: "#privacy", className: "font-body text-muted-foreground hover:text-primary transition-colors text-sm" }, "Privacy Policy"),
                        React.createElement("a", { href: "#terms", className: "font-body text-muted-foreground hover:text-primary transition-colors text-sm" }, "Terms of Service"),
                        React.createElement("a", { href: "#cookies", className: "font-body text-muted-foreground hover:text-primary transition-colors text-sm" }, "Cookie Policy")))))));
};
export default Footer;
