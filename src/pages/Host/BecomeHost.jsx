import React from "react";

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Home, Sparkles, Mountain, Star, ArrowRight, Check } from 'lucide-react';
const BecomeHost = () => {
    const hostingTypes = [
        {
            icon: Home,
            title: "Accommodations",
            description: "Share your space with travelers from around the world",
            earnings: "Earn up to $2,500/month",
            examples: ["Entire homes", "Private rooms", "Unique stays"]
        },
        {
            icon: Sparkles,
            title: "Services",
            description: "Offer professional services to enhance guest experiences",
            earnings: "Earn $50-500/session",
            examples: ["Spa treatments", "Personal chef", "Fitness training"]
        },
        {
            icon: Mountain,
            title: "Experiences",
            description: "Create memorable activities and local adventures",
            earnings: "Earn $75-300/person",
            examples: ["Tours & guides", "Workshops", "Cultural activities"]
        }
    ];
    const benefits = [
        "Set your own schedule and prices",
        "Connect with guests from around the world",
        "Earn extra income doing what you love",
        "Get support from our dedicated host community",
        "Access to professional photography services",
        "24/7 customer support for hosts and guests"
    ];
    const steps = [
        {
            number: "1",
            title: "Tell us about your space or service",
            description: "Share some basic info, like location, capacity, and amenities."
        },
        {
            number: "2",
            title: "Make it stand out",
            description: "Add photos, descriptions, and unique details that make your listing shine."
        },
        {
            number: "3",
            title: "Finish and publish",
            description: "Set your availability, pricing, and house rules, then publish your listing."
        }
    ];
    return (React.createElement("div", { className: "min-h-screen bg-background" },
        React.createElement(Navigation, null),
        React.createElement("section", { className: "pt-24 pb-16 px-6 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" },
            React.createElement("div", { className: "max-w-7xl mx-auto" },
                React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" },
                    React.createElement("div", { className: "animate-fade-in" },
                        React.createElement("h1", { className: "font-heading text-4xl md:text-6xl font-bold text-foreground mb-6" }, "Start earning as a Havenly Host"),
                        React.createElement("p", { className: "font-body text-xl text-muted-foreground mb-8 leading-relaxed" }, "Share your space, offer services, or create experiences. Join our community of hosts and start earning extra income today."),
                        React.createElement("button", { className: "btn-primary text-lg px-8 py-4 mb-8" }, "Get Started"),
                        React.createElement("div", { className: "flex items-center gap-6 text-sm text-muted-foreground" },
                            React.createElement("div", { className: "flex items-center gap-2" },
                                React.createElement(Star, { className: "w-4 h-4 fill-yellow-400 text-yellow-400" }),
                                React.createElement("span", null, "4.9/5 host satisfaction")),
                            React.createElement("div", null, "\u2022"),
                            React.createElement("div", null, "Join 50,000+ hosts worldwide"))),
                    React.createElement("div", { className: "animate-slide-up" },
                        React.createElement("img", { src: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800&q=80", alt: "Happy host", className: "w-full h-96 object-cover rounded-3xl shadow-elegant" }))))),
        React.createElement("section", { className: "py-20 px-6" },
            React.createElement("div", { className: "max-w-7xl mx-auto" },
                React.createElement("div", { className: "text-center mb-16" },
                    React.createElement("h2", { className: "font-heading text-4xl font-bold text-foreground mb-6" }, "What can you host?"),
                    React.createElement("p", { className: "font-body text-xl text-muted-foreground max-w-2xl mx-auto" }, "Whether you have a spare room, professional skills, or local knowledge, there's a way to earn with Havenly")),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8" }, hostingTypes.map((type, index) => {
                    const IconComponent = type.icon;
                    return (React.createElement("div", { key: type.title, className: "card-listing hover-lift cursor-pointer animate-slide-up", style: { animationDelay: `${index * 150}ms` } },
                        React.createElement("div", { className: "p-8 text-center" },
                            React.createElement("div", { className: "w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6" },
                                React.createElement(IconComponent, { className: "w-8 h-8 text-primary" })),
                            React.createElement("h3", { className: "font-heading text-2xl font-bold text-foreground mb-4" }, type.title),
                            React.createElement("p", { className: "font-body text-muted-foreground mb-6 leading-relaxed" }, type.description),
                            React.createElement("div", { className: "bg-accent/10 rounded-xl p-4 mb-6" },
                                React.createElement("p", { className: "font-medium text-accent text-lg" }, type.earnings)),
                            React.createElement("div", { className: "space-y-2 mb-8" }, type.examples.map((example, idx) => (React.createElement("div", { key: idx, className: "flex items-center gap-2 text-sm text-muted-foreground" },
                                React.createElement(Check, { className: "w-4 h-4 text-primary" }),
                                React.createElement("span", null, example))))),
                            React.createElement("button", { className: "btn-outline w-full group" },
                                "Start hosting ",
                                type.title.toLowerCase(),
                                React.createElement(ArrowRight, { className: "w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" })))));
                })))),
        React.createElement("section", { className: "py-20 px-6 bg-muted/30" },
            React.createElement("div", { className: "max-w-7xl mx-auto" },
                React.createElement("div", { className: "text-center mb-16" },
                    React.createElement("h2", { className: "font-heading text-4xl font-bold text-foreground mb-6" }, "How hosting works"),
                    React.createElement("p", { className: "font-body text-xl text-muted-foreground" }, "Getting started is simple and straightforward")),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8" }, steps.map((step, index) => (React.createElement("div", { key: step.number, className: "text-center animate-fade-in", style: { animationDelay: `${index * 200}ms` } },
                    React.createElement("div", { className: "w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-heading text-2xl font-bold mx-auto mb-6" }, step.number),
                    React.createElement("h3", { className: "font-heading text-xl font-bold text-foreground mb-4" }, step.title),
                    React.createElement("p", { className: "font-body text-muted-foreground leading-relaxed" }, step.description))))))),
        React.createElement("section", { className: "py-20 px-6" },
            React.createElement("div", { className: "max-w-7xl mx-auto" },
                React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" },
                    React.createElement("div", null,
                        React.createElement("h2", { className: "font-heading text-4xl font-bold text-foreground mb-8" }, "Why host with Havenly?"),
                        React.createElement("div", { className: "space-y-4" }, benefits.map((benefit, index) => (React.createElement("div", { key: index, className: "flex items-start gap-4 animate-fade-in", style: { animationDelay: `${index * 100}ms` } },
                            React.createElement(Check, { className: "w-6 h-6 text-primary flex-shrink-0 mt-0.5" }),
                            React.createElement("p", { className: "font-body text-muted-foreground leading-relaxed" }, benefit)))))),
                    React.createElement("div", { className: "grid grid-cols-2 gap-4" },
                        React.createElement("img", { src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=400&q=80", alt: "Host workspace", className: "w-full h-48 object-cover rounded-2xl" }),
                        React.createElement("img", { src: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80", alt: "Happy guests", className: "w-full h-48 object-cover rounded-2xl mt-8" }))))),
        React.createElement("section", { className: "py-20 px-6 bg-gradient-to-br from-primary to-accent" },
            React.createElement("div", { className: "max-w-4xl mx-auto text-center" },
                React.createElement("h2", { className: "font-heading text-4xl md:text-5xl font-bold text-white mb-6" }, "Ready to start hosting?"),
                React.createElement("p", { className: "font-body text-xl text-white/90 mb-8 leading-relaxed" }, "Join thousands of hosts who are already earning with Havenly. It takes just a few minutes to get started."),
                React.createElement("button", { className: "bg-white text-primary hover:bg-white/90 font-heading font-bold text-lg px-8 py-4 rounded-2xl transition-all hover-lift" }, "Become a Host Today"))),
        React.createElement(Footer, null)));
};
export default BecomeHost;
