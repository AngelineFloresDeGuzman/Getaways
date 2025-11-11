import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const PartnersSection = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        // Check if there's a 'partners' collection in Firestore
        const partnersRef = collection(db, 'partners');
        const q = query(
          partnersRef,
          where('active', '==', true),
          limit(8)
        );

        const querySnapshot = await getDocs(q);
        const partnersList = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name && data.logo) {
            partnersList.push({
              id: doc.id,
              name: data.name,
              logo: data.logo,
              website: data.website || null
            });
          }
        });

        setPartners(partnersList);
      } catch (error) {
        // If partners collection doesn't exist or has no data, hide section
        console.log('No partners data available:', error);
        setPartners([]);
      } finally {
        setLoading(false);
      }
    };

    loadPartners();
  }, []);

  // Don't show section if no partners or still loading
  if (loading || partners.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-background border-y border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <p className="text-muted-foreground font-body mb-6">
            Trusted by employees at:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6 items-center justify-items-center">
            {partners.map((partner) => (
              <a
                key={partner.id}
                href={partner.website || '#'}
                target={partner.website ? '_blank' : undefined}
                rel={partner.website ? 'noopener noreferrer' : undefined}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center border border-border hover:scale-110 transition-transform duration-300 shadow-sm"
                title={partner.name}
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="w-16 h-16 object-contain rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;

