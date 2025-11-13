import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Mountain, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import LogIn from "@/pages/Auth/LogIn";
import Loading from "./Loading";

const Categories = () => {
    const navigate = useNavigate();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Accept optional search params for navigation
    const handleNavigate = (link, params = {}) => {
        const urlParams = new URLSearchParams(params).toString();
        navigate(urlParams ? `${link}?${urlParams}` : link);
    };

    const handleRequireLogin = () => {
        setShowLoginModal(true);
    };

    // Load categories dynamically from Firestore
    useEffect(() => {
        const loadCategories = async () => {
            try {
                setLoading(true);
                const listingsRef = collection(db, 'listings');
                
                // Get counts for each category
                const categoryData = [
                    {
                        id: 'accommodation',
                        title: 'Accommodations',
                        description: 'Find your perfect stay from cozy cabins to luxury villas',
                        link: '/accommodations',
                        icon: Home,
                        image: '/images/accommodations.jpg'
                    },
                    {
                        id: 'experience',
                        title: 'Experiences',
                        description: 'Discover unique activities and local adventures',
                        link: '/experiences',
                        icon: Mountain,
                        image: '/images/experiences.jpg'
                    },
                    {
                        id: 'service',
                        title: 'Services',
                        description: 'Enhance your stay with personalized services',
                        link: '/services',
                        icon: Sparkles,
                        image: '/images/services.jpg'
                    }
                ];

                // Get counts and sample images for each category
                const categoriesWithCounts = await Promise.all(
                    categoryData.map(async (category) => {
                        try {
                            // Query for active listings in this category
                            let querySnapshot;
                            try {
                                const q = query(
                                    listingsRef,
                                    where('category', '==', category.id),
                                    where('status', '==', 'active')
                                );
                                querySnapshot = await getDocs(q);
                            } catch (error) {
                                // Fallback: query by category only, filter in JavaScript
                                const q = query(
                                    listingsRef,
                                    where('category', '==', category.id)
                                );
                                querySnapshot = await getDocs(q);
                            }

                            // Filter by status and get count + sample image
                            let count = 0;
                            let sampleImage = null;
                            
                            querySnapshot.forEach((doc) => {
                                const data = doc.data();
                                if (data.status === 'active') {
                                    count++;
                                    // Get first available image if we don't have one yet
                                    if (!sampleImage) {
                                        const photos = data.photos || [];
                                        if (photos.length > 0) {
                                            sampleImage = photos[0]?.base64 || photos[0]?.url || null;
                                        } else if (data.image) {
                                            sampleImage = data.image;
                                        }
                                    }
                                }
                            });

                            return {
                                ...category,
                                stats: `${count} ${count === 1 ? 'listing' : 'listings'} available`,
                                image: sampleImage || category.image // Use sample image from listings or fallback
                            };
                        } catch (error) {
                            console.error(`Error loading count for ${category.id}:`, error);
                            return {
                                ...category,
                                stats: 'Loading...'
                            };
                        }
                    })
                );

                setCategories(categoriesWithCounts);
            } catch (error) {
                console.error('Error loading categories:', error);
                // Fallback to default categories without counts
                setCategories([
                    {
                        id: 'accommodation',
                        title: 'Accommodations',
                        description: 'Find your perfect stay from cozy cabins to luxury villas',
                        link: '/accommodations',
                        icon: Home,
                        image: '/images/accommodations.jpg',
                        stats: 'Explore accommodations'
                    },
                    {
                        id: 'experience',
                        title: 'Experiences',
                        description: 'Discover unique activities and local adventures',
                        link: '/experiences',
                        icon: Mountain,
                        image: '/images/experiences.jpg',
                        stats: 'Explore experiences'
                    },
                    {
                        id: 'service',
                        title: 'Services',
                        description: 'Enhance your stay with personalized services',
                        link: '/services',
                        icon: Sparkles,
                        image: '/images/services.jpg',
                        stats: 'Explore services'
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadCategories();
    }, []);

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

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loading message="Loading categories..." />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {categories.map((category, index) => {
                            const Icon = category.icon;
                            const hasImage = category.image && (category.image.startsWith('data:') || category.image.startsWith('http') || category.image.startsWith('/'));
                            return (
                                <div
                                    key={category.id}
                                    className="card-listing hover-lift group cursor-pointer animate-slide-up flex flex-col h-full"
                                    style={{ animationDelay: `${index * 150}ms` }}
                                    onClick={() => handleNavigate(category.link)}
                                >
                                    {/* Icon/Image block */}
                                    <div className="relative h-48 overflow-hidden rounded-t-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                        {hasImage ? (
                                            <img
                                                src={category.image}
                                                alt={category.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                onError={(e) => {
                                                    // Fallback to icon if image fails
                                                    e.target.style.display = 'none';
                                                    const fallback = e.target.parentElement.querySelector('.icon-fallback');
                                                    if (fallback) fallback.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div 
                                            className={`absolute inset-0 flex items-center justify-center icon-fallback ${hasImage ? 'hidden' : 'flex'}`}
                                        >
                                            <Icon className="w-24 h-24 text-primary opacity-50" />
                                        </div>
                                    </div>

                                    {/* Info block - flex-1 to push button to bottom */}
                                    <div className="p-8 text-center flex flex-col flex-1">
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <Icon className="w-6 h-6 text-primary" />
                                            <h3 className="font-heading text-2xl font-bold text-foreground">
                                                {category.title}
                                            </h3>
                                        </div>
                                        <p className="font-body text-primary font-semibold mb-3 text-sm">
                                            {category.stats}
                                        </p>
                                        <p className="font-body text-muted-foreground mb-6 leading-relaxed flex-1">
                                            {category.description}
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNavigate(category.link);
                                            }}
                                            className="btn-outline w-full mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                                        >
                                            Explore {category.title}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Login Modal */}
            {showLoginModal && <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />}
        </section>
    );
};

export default Categories;
