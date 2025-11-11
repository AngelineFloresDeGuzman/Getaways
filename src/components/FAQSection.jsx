import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getActiveFAQs } from '@/pages/Admin/services/policyService';
import Loading from './Loading';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default FAQs as fallback
  const defaultFaqs = [
    {
      question: 'How do I cancel a booking?',
      answer: 'You can cancel a booking from your Bookings page. Refunds are processed according to the cancellation policy selected by the host. Flexible policies offer full refunds for cancellations made at least 24 hours before check-in.'
    },
    {
      question: 'What is the refund policy?',
      answer: 'Refund policies vary by host and are clearly displayed on each listing. Most hosts offer flexible cancellation policies that provide full refunds for cancellations made within a reasonable timeframe. Check the cancellation policy on the listing page before booking.'
    },
    {
      question: 'How do I contact a host?',
      answer: 'You can message hosts directly through the Getaways messaging system. Once you make a booking request, you\'ll be able to communicate with the host through the platform. Hosts typically respond within 24 hours.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We use the GetPay wallet system for all transactions. You can add funds to your wallet using PayPal. All payments are processed securely and your payment is protected until after your stay is completed.'
    },
    {
      question: 'How do I leave a review?',
      answer: 'After completing your stay, you can leave a review from your Bookings page. Simply navigate to the completed booking and click "Leave a Review". Your feedback helps other travelers make informed decisions.'
    },
    {
      question: 'What if I have a problem during my stay?',
      answer: 'If you encounter any issues during your stay, contact the host immediately through the messaging system. If the problem persists, reach out to our 24/7 support team who can help resolve the issue quickly.'
    }
  ];

  useEffect(() => {
    const loadFAQs = async () => {
      try {
        const faqsFromPolicy = await getActiveFAQs();
        if (faqsFromPolicy.length > 0) {
          setFaqs(faqsFromPolicy);
        } else {
          // Use default FAQs if no FAQs in policy system
          setFaqs(defaultFaqs);
        }
      } catch (error) {
        console.error('Error loading FAQs:', error);
        // Use default FAQs on error
        setFaqs(defaultFaqs);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, []);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <Loading message="Loading FAQs..." />
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return null; // Hide section if no FAQs
  }

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Address some major questions to help people make the final call
          </p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="card-listing overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-primary/5 transition-colors duration-200"
              >
                <span className="font-heading text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="font-body text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

