import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const reviewsRef = collection(db, 'reviews');
        let querySnapshot;
        
        // Try with orderBy first, fallback to without if index doesn't exist
        try {
          const q = query(
            reviewsRef,
            orderBy('createdAt', 'desc'),
            limit(20) // Get more to filter
          );
          querySnapshot = await getDocs(q);
        } catch (indexError) {
          // Fallback: get all reviews and sort in JavaScript
          const q = query(reviewsRef, limit(50));
          querySnapshot = await getDocs(q);
        }

        const reviews = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.rating >= 4 && data.comment && data.comment.trim().length > 0) { // Only show 4+ star reviews with non-empty comments
            reviews.push({
              id: doc.id,
              reviewerName: data.reviewerName || 'Anonymous',
              reviewerImage: data.reviewerImage || null,
              rating: data.rating || 5,
              comment: data.comment,
              listingTitle: data.listingTitle || 'Listing',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
            });
          }
        });

        // Sort by rating (highest first), then by date (newest first)
        reviews.sort((a, b) => {
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.createdAt - a.createdAt;
        });

        // Only show real reviews - no placeholders
        setTestimonials(reviews.slice(0, 6)); // Show up to 6 best reviews
      } catch (error) {
        // Don't show fake data on error - just show empty state
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    loadTestimonials();
  }, []);

  // Don't show section if no testimonials available
  if (loading) {
    return null; // Hide section while loading
  }

  // Only show section if we have real testimonials
  if (testimonials.length === 0) {
    return null; // Hide section if no reviews
  }

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
            Loved by people worldwide
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real reviews from our community of travelers
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.slice(0, 6).map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="card-listing p-8 hover-lift animate-slide-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < testimonial.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="font-body text-foreground mb-6 leading-relaxed">
                "{testimonial.comment}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  {testimonial.reviewerImage ? (
                    <img
                      src={testimonial.reviewerImage}
                      alt={testimonial.reviewerName}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span 
                    className="text-primary font-bold text-lg"
                    style={{ display: testimonial.reviewerImage ? 'none' : 'flex' }}
                  >
                    {testimonial.reviewerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.reviewerName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.listingTitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

