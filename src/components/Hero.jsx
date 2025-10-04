import React, { useState } from "react";
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import heroImage from '@/assets/hero-background.jpg';

const Hero = () => {
    const [searchData, setSearchData] = useState({
        location: '',
        checkIn: '',
        checkOut: '',
        guests: '1'
    });
    const handleSearch = () => {
        console.log('Searching with:', searchData);
        // TODO: Implement search functionality
    };
    return (React.createElement("div", { className: "relative min-h-screen flex items-center justify-center overflow-hidden" },
        React.createElement("div", { className: "absolute inset-0 bg-cover bg-center bg-no-repeat", style: { backgroundImage: `url(${heroImage})` } },
            React.createElement("div", { className: "absolute inset-0 bg-black/30" })),
        React.createElement("div", { className: "relative z-10 max-w-4xl mx-auto px-6 text-center animate-fade-in" },
            React.createElement("h1", { className: "font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight" },
                "Find Your Perfect",
                React.createElement("span", { className: "text-gradient block mt-2" }, "Stay Experience")),
            React.createElement("p", { className: "font-body text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed" }, "Discover unique accommodations, exceptional services, and unforgettable experiences with Havenly"),
            React.createElement("div", { className: "bg-white/98 backdrop-blur-sm rounded-2xl p-6 shadow-strong max-w-4xl mx-auto animate-slide-up border border-border" },
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 items-end" },
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement("label", { className: "font-heading text-sm font-semibold text-foreground flex items-center gap-2" },
                            React.createElement(MapPin, { className: "w-4 h-4 text-primary" }),
                            "Where"),
                        React.createElement("input", { type: "text", placeholder: "Search destinations", className: "input-field", value: searchData.location, onChange: (e) => setSearchData(Object.assign(Object.assign({}, searchData), { location: e.target.value })) })),
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement("label", { className: "font-heading text-sm font-semibold text-foreground flex items-center gap-2" },
                            React.createElement(Calendar, { className: "w-4 h-4 text-primary" }),
                            "Check in"),
                        React.createElement("input", { type: "date", className: "input-field", value: searchData.checkIn, onChange: (e) => setSearchData(Object.assign(Object.assign({}, searchData), { checkIn: e.target.value })) })),
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement("label", { className: "font-heading text-sm font-semibold text-foreground flex items-center gap-2" },
                            React.createElement(Calendar, { className: "w-4 h-4 text-primary" }),
                            "Check out"),
                        React.createElement("input", { type: "date", className: "input-field", value: searchData.checkOut, onChange: (e) => setSearchData(Object.assign(Object.assign({}, searchData), { checkOut: e.target.value })) })),
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement("label", { className: "font-heading text-sm font-semibold text-foreground flex items-center gap-2" },
                            React.createElement(Users, { className: "w-4 h-4 text-primary" }),
                            "Guests"),
                        React.createElement("div", { className: "flex gap-2" },
                            React.createElement("select", { className: "input-field flex-1 h-[50px]", value: searchData.guests, onChange: (e) => setSearchData(Object.assign(Object.assign({}, searchData), { guests: e.target.value })) },
                                React.createElement("option", { value: "1" }, "1 Guest"),
                                React.createElement("option", { value: "2" }, "2 Guests"),
                                React.createElement("option", { value: "3" }, "3 Guests"),
                                React.createElement("option", { value: "4" }, "4 Guests"),
                                React.createElement("option", { value: "5+" }, "5+ Guests")),
                            React.createElement("button", { onClick: handleSearch, className: "btn-primary flex items-center justify-center aspect-square h-[50px] px-3" },
                                React.createElement(Search, { className: "w-5 h-5" })))))))));
};
export default Hero;
