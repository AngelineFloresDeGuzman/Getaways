import React, { useState } from "react";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import heroImage from "@/assets/hero-background.jpg";
import { ChevronDown } from "lucide-react";

const Hero = ({ darkMode }) => {
    const [searchData, setSearchData] = useState({
        location: "",
        checkIn: "",
        checkOut: "",
        guests: "1",
        mode: "dates", // "dates" | "months" | "flexible"
        monthFrom: "",
        monthTo: "",
        flexibleOption: "",
        flexibleMonth: "",
        adults: 0,
        children: 0,
        infants: 0,
        pets: 0,
    });

    const [showSuggestions, setShowSuggestions] = useState(false);

    const destinations = [
        "Manila, Philippines",
        "Paris, France",
        "Tokyo, Japan",
        "New York, USA",
        "Rome, Italy",
        "Bali, Indonesia",
        "Sydney, Australia",
        "Seoul, South Korea",
        "London, UK",
    ];

    // ✅ Dynamically generate the next 18 months
    const generateMonths = (count = 18) => {
        const months = [];
        const today = new Date();

        for (let i = 0; i < count; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const formatted = date.toLocaleString("default", {
                month: "long",
                year: "numeric",
            });
            months.push(formatted);
        }
        return months;
    };

    const months = generateMonths(18);

    const flexibleOptions = ["Weekend", "Week", "Month"];

    const handleSearch = () => {
        console.log("Searching with:", searchData);
        // TODO: Implement search functionality
    };

    return (
        <div id="hero-section" className="relative min-h-screen flex items-center overflow-hidden">
            {/* Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${heroImage})` }}
            >
                <div className="absolute inset-0 bg-black/50" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left Section */}
                <div className="text-left animate-fade-in">
                    <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                        Find Your Perfect{" "}
                        <span className="text-gradient block mt-2">Stay Experience</span>
                    </h1>
                    <p className="font-body text-lg md:text-xl text-white/90 mb-8 max-w-xl leading-relaxed">
                        Discover unique accommodations, exceptional services, and
                        unforgettable experiences with Havenly.
                    </p>
                </div>

                {/* Right Section - Search Card */}
                <div className={`rounded-2xl shadow-xl border p-8 max-w-md w-full mx-auto animate-slide-up
  ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white/95 border-gray-200"}`}>
                    <h2 className={`font-heading text-2xl font-semibold mb-6 text-center
  ${darkMode ? "text-white" : "text-foreground"}`}>
                        Start Your Journey
                    </h2>

                    <div className="space-y-5">
                        {/* Location with Suggestions */}
                        <div className="relative">
                            <label
                                className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                    }`}
                            >
                                <MapPin className="w-4 h-4 text-primary" />
                                Where
                            </label>
                            <input
                                type="text"
                                placeholder="Search destinations"
                                className="input-field w-full"
                                value={searchData.location}
                                onChange={(e) =>
                                    setSearchData({ ...searchData, location: e.target.value })
                                }
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            />

                            {/* Suggestions Dropdown */}
                            {showSuggestions && (
                                <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                                    <li className="px-4 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                                        Suggested Destinations
                                    </li>

                                    {destinations
                                        .filter((d) =>
                                            d.toLowerCase().includes(searchData.location.toLowerCase())
                                        )
                                        .map((d, i) => (
                                            <li
                                                key={i}
                                                onClick={() => {
                                                    setSearchData({ ...searchData, location: d });
                                                    setShowSuggestions(false);
                                                }}
                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
                                            >
                                                {d}
                                            </li>
                                        ))}
                                    {destinations.filter((d) =>
                                        d.toLowerCase().includes(searchData.location.toLowerCase())
                                    ).length === 0 && (
                                            <li className="px-4 py-2 text-gray-500">No matches found</li>
                                        )}
                                </ul>
                            )}
                        </div>

                        {/* Tabs for Dates / Months / Flexible */}
                        <div>
                            {/* Segmented Toggle Tabs - Full Width */}
                            <div className="flex mb-4 bg-gray-200 rounded-full p-1">
                                {["dates", "months", "flexible"].map((tab, idx) => {
                                    const isActive = searchData.mode === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setSearchData({ ...searchData, mode: tab })}
                                            className={`flex-1 text-center px-4 py-1 text-sm font-medium transition-all ${isActive
                                                ? "bg-primary text-white"
                                                : "text-gray-700 hover:bg-gray-300"
                                                } ${idx === 0 ? "rounded-l-full" : ""} ${idx === 2 ? "rounded-r-full" : ""}`}
                                        >
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Mode: Dates */}
                            {searchData.mode === "dates" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                                }`}
                                        >
                                            <Calendar className="w-4 h-4 text-primary" />
                                            Check in
                                        </label>
                                        <input
                                            type="date"
                                            className="input-field w-full text-gray-500 font-normal"
                                            value={searchData.checkIn}
                                            onChange={(e) =>
                                                setSearchData({ ...searchData, checkIn: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                                }`}
                                        >
                                            <Calendar className="w-4 h-4 text-primary" />
                                            Check out
                                        </label>
                                        <input
                                            type="date"
                                            className="input-field w-full text-gray-500 font-normal"
                                            value={searchData.checkOut}
                                            onChange={(e) =>
                                                setSearchData({
                                                    ...searchData,
                                                    checkOut: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Mode: Months */}
                            {searchData.mode === "months" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(() => {
                                        const now = new Date();
                                        const months = Array.from({ length: 18 }, (_, i) => {
                                            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
                                            return date.toLocaleString("default", { month: "long", year: "numeric" });
                                        });

                                        return (
                                            <>
                                                {/* From */}
                                                <div className="relative">
                                                    <label
                                                        className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                                            }`}
                                                    >
                                                        <Calendar className={`w-4 h-4 ${darkMode ? "text-white" : "text-primary"}`} />
                                                        From
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSearchData((prev) => ({
                                                                ...prev,
                                                                showMonthFromDropdown: !prev.showMonthFromDropdown,
                                                            }))
                                                        }
                                                        className={`input-field w-full text-left flex justify-between items-center ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                            }`}
                                                    >
                                                        <span className={`${!searchData.monthFrom ? "text-gray-500 font-normal" : ""}`}>
                                                            {searchData.monthFrom || "Select month"}
                                                        </span>
                                                        <svg
                                                            className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {searchData.showMonthFromDropdown && (
                                                        <ul
                                                            className={`absolute mt-1 w-full max-h-36 overflow-y-auto border rounded-xl shadow-lg z-20 ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                                }`}
                                                        >
                                                            {months.map((m, i) => (
                                                                <li
                                                                    key={i}
                                                                    onClick={() =>
                                                                        setSearchData({
                                                                            ...searchData,
                                                                            monthFrom: m,
                                                                            showMonthFromDropdown: false,
                                                                        })
                                                                    }
                                                                    className="px-4 py-2 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                                                >
                                                                    {m}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>

                                                {/* To */}
                                                <div className="relative">
                                                    <label
                                                        className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                                            }`}
                                                    >
                                                        <Calendar className={`w-4 h-4 ${darkMode ? "text-white" : "text-primary"}`} />
                                                        To
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSearchData((prev) => ({
                                                                ...prev,
                                                                showMonthToDropdown: !prev.showMonthToDropdown,
                                                            }))
                                                        }
                                                        className={`input-field w-full text-left flex justify-between items-center ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                            }`}
                                                    >
                                                        <span className={`${!searchData.monthTo ? "text-gray-500 font-normal" : ""}`}>
                                                            {searchData.monthTo || "Select month"}
                                                        </span>
                                                        <svg
                                                            className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {searchData.showMonthToDropdown && (
                                                        <ul
                                                            className={`absolute mt-1 w-full max-h-36 overflow-y-auto border rounded-xl shadow-lg z-20 ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                                }`}
                                                        >
                                                            {months.map((m, i) => (
                                                                <li
                                                                    key={i}
                                                                    onClick={() =>
                                                                        setSearchData({
                                                                            ...searchData,
                                                                            monthTo: m,
                                                                            showMonthToDropdown: false,
                                                                        })
                                                                    }
                                                                    className="px-4 py-2 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                                                >
                                                                    {m}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Mode: Flexible */}
                            {searchData.mode === "flexible" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Stay Duration Dropdown */}
                                    <div className="relative">
                                        <label
                                            className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                                }`}
                                        >
                                            <Calendar className={`w-4 h-4 ${darkMode ? "text-white" : "text-primary"}`} />
                                            Trip duration
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSearchData((prev) => ({ ...prev, showFlexibleOptionDropdown: !prev.showFlexibleOptionDropdown }))
                                            }
                                            className={`input-field w-full text-left flex justify-between items-center ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                }`}
                                        >
                                            <span className={`${!searchData.flexibleOption ? "text-gray-500 font-normal" : ""}`}>
                                                {searchData.flexibleOption || "Select duration"}
                                            </span>
                                            <svg
                                                className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {searchData.showFlexibleOptionDropdown && (
                                            <ul
                                                className={`absolute mt-1 w-full max-h-36 overflow-y-auto border rounded-xl shadow-lg z-20 ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                    }`}
                                            >
                                                {flexibleOptions.map((opt, i) => (
                                                    <li
                                                        key={i}
                                                        onClick={() =>
                                                            setSearchData({ ...searchData, flexibleOption: opt, showFlexibleOptionDropdown: false })
                                                        }
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                                    >
                                                        {opt}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Go Anytime Dropdown */}
                                    <div className="relative">
                                        <label
                                            className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                                }`}
                                        >
                                            <Calendar className={`w-4 h-4 ${darkMode ? "text-white" : "text-primary"}`} />
                                            Travel month
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSearchData((prev) => ({ ...prev, showFlexibleMonthDropdown: !prev.showFlexibleMonthDropdown }))
                                            }
                                            className={`input-field w-full text-left flex justify-between items-center ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                }`}
                                        >
                                            <span className={`${!searchData.flexibleMonth ? "text-gray-500 font-normal" : ""}`}>
                                                {searchData.flexibleMonth || "Select month"}
                                            </span>
                                            <svg
                                                className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {searchData.showFlexibleMonthDropdown && (
                                            <ul
                                                className={`absolute mt-1 w-full max-h-36 overflow-y-auto border rounded-xl shadow-lg z-20 ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                                                    }`}
                                            >
                                                {months.map((m, i) => (
                                                    <li
                                                        key={i}
                                                        onClick={() =>
                                                            setSearchData({ ...searchData, flexibleMonth: m, showFlexibleMonthDropdown: false })
                                                        }
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                                    >
                                                        {m}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Guests Dropdown */}
                        <div className="relative">
                            <label
                                className={`font-body text-sm font-semibold mb-1 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-700"
                                    }`}
                            >
                                <Users className="w-4 h-4 text-primary" />
                                Guests
                            </label>

                            {/* Input-like toggle */}
                            <div
                                onClick={() =>
                                    setSearchData((prev) => ({ ...prev, showGuestsDropdown: !prev.showGuestsDropdown }))
                                }
                                className={`w-full border rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer 
                                ${darkMode ? "bg-gray-900 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
                            >
                                <span className={`${(searchData.adults + searchData.children + searchData.infants + searchData.pets === 0) ? "text-gray-500" : ""}`}>
                                    {searchData.adults + searchData.children + searchData.infants + searchData.pets === 0
                                        ? "Add guests"
                                        : `${searchData.adults || 0} Adults, ${searchData.children || 0} Children, ${searchData.infants || 0} Infants, ${searchData.pets || 0} Pets`}
                                </span>
                                <svg
                                    className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Dropdown content */}
                            {searchData.showGuestsDropdown && (
                                <div className="absolute mt-2 w-full bg-white border border-gray-300 rounded-xl shadow-lg p-4 z-20 space-y-4">
                                    {[
                                        { label: "Adults", desc: "Ages 13 or above", key: "adults" },
                                        { label: "Children", desc: "Ages 2 – 12", key: "children" },
                                        { label: "Infants", desc: "Under 2", key: "infants" },
                                        {
                                            label: "Pets",
                                            desc: "Bringing a service animal?",
                                            key: "pets",
                                            link: "https://www.airbnb.com/help/article/1869",
                                        },
                                    ].map((item) => (
                                        <div key={item.key} className="flex justify-between items-center">
                                            <div>
                                                <p className="font-body text-sm font-semibold text-gray-700">{item.label}</p>
                                                {item.link ? (
                                                    <a
                                                        href={item.link}
                                                        target="_blank"
                                                        className="font-body text-xs text-primary underline"
                                                    >
                                                        {item.desc}
                                                    </a>
                                                ) : (
                                                    <p className="font-body text-xs text-gray-500">{item.desc}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSearchData((prev) => ({
                                                            ...prev,
                                                            [item.key]: Math.max((prev[item.key] || 0) - 1, 0),
                                                        }))
                                                    }
                                                    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center text-sm font-medium">{searchData[item.key] || 0}</span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSearchData((prev) => ({
                                                            ...prev,
                                                            [item.key]: (prev[item.key] || 0) + 1,
                                                        }))
                                                    }
                                                    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search Button */}
                        <button
                            onClick={handleSearch}
                            className={`w-full btn-primary flex items-center justify-center gap-2 py-3 text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all
                            ${darkMode ? "text-white" : "text-gray-900"}`} // <-- change color based on darkMode
                        >
                            Search Havenly
                            <Search className={`w-5 h-5 ${darkMode ? "text-white" : "text-gray-900"}`} /> {/* Icon color */}
                        </button>
                    </div>
                </div>
            </div>
            <div
                className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-20 h-20 flex items-center justify-center cursor-pointer"
                onClick={() => {
                    const hero = document.getElementById("hero-section");
                    if (hero) {
                        // Scroll so the hero's bottom aligns at the top of the page
                        const heroBottom = hero.offsetTop + hero.offsetHeight;
                        window.scrollTo({
                            top: heroBottom,
                            behavior: "smooth", // smooth scrolling
                        });
                    }
                }}
            >
                <ChevronDown className="w-16 h-16 text-white animate-jump" />
            </div>
        </div >
    );
};

export default Hero;