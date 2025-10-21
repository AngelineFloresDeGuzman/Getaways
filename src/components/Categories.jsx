import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogIn from "@/pages/Auth/LogIn";

const Categories = () => {
    const navigate = useNavigate();
    const [showLoginModal, setShowLoginModal] = useState(false);

    // TODO: This will be populated dynamically from API/database
    const categories = [];

    const handleNavigate = (link) => {
        navigate(link);
    };

    const handleRequireLogin = () => {
        setShowLoginModal(true);
    };

    return (
        <section className="py-36 px-6 bg-muted/30">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-6">
                        Explore What We Offer
                    </h2>
                    <p className="font-body text-xl text-muted-foreground max-w-2xl mx-auto">
                        From comfortable accommodations to unique experiences, find everything you need for your perfect getaway
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {categories.length > 0 ? (
                        categories.map((category, index) => (
                            <div
                                key={category.id}
                                className="card-listing hover-lift group cursor-pointer animate-slide-up"
                                style={{ animationDelay: `${index * 150}ms` }}
                            >
                                {/* Image block */}
                                <div className="relative h-48 overflow-hidden rounded-lg">
                                    <img
                                        src={category.image}
                                        alt={category.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Info block */}
                                <div className="p-8 text-center">
                                    <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                                        {category.title}
                                    </h3>
                                    <p className="font-body text-muted-foreground mb-2 text-sm">
                                        {category.stats}
                                    </p>
                                    <p className="font-body text-muted-foreground mb-6 leading-relaxed">
                                        {category.description}
                                    </p>
                                    <button
                                        onClick={() => handleNavigate(category.link)}
                                        className="btn-outline w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                                    >
                                        Explore {category.title}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* Placeholder for empty categories */
                        <div className="col-span-full text-center py-16">
                            <p className="text-muted-foreground">Categories will be loaded dynamically</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Login Modal */}
            {showLoginModal && <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />}
        </section>
    );
};

export default Categories;
