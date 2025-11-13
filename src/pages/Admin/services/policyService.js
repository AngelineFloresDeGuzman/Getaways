// Policy & Compliance Service for Admin
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const POLICIES_COLLECTION = 'policies';

/**
 * Policy types
 */
export const POLICY_TYPES = {
  CANCELLATION_GUEST: 'cancellation_guest',
  CANCELLATION_HOST: 'cancellation_host',
  TERMS_CONDITIONS: 'terms_conditions',
  PRIVACY_POLICY: 'privacy_policy',
  HOST_RULES: 'host_rules',
  GUEST_RULES: 'guest_rules',
  COMMUNITY_STANDARDS: 'community_standards',
  REFUND_POLICY: 'refund_policy',
  SERVICE_TERMS: 'service_terms',
  EXPERIENCE_TERMS: 'experience_terms',
  FAQ: 'faq'
};

/**
 * Get all policies
 * @returns {Promise<Array>}
 */
export const getAllPolicies = async () => {
  try {
    const policiesRef = collection(db, POLICIES_COLLECTION);
    const q = query(policiesRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting policies:', error);
    throw error;
  }
};

/**
 * Get policy by ID
 * @param {string} policyId
 * @returns {Promise<Object>}
 */
export const getPolicyById = async (policyId) => {
  try {
    const policyRef = doc(db, POLICIES_COLLECTION, policyId);
    const policyDoc = await getDoc(policyRef);
    
    if (!policyDoc.exists()) {
      throw new Error('Policy not found');
    }
    
    return {
      id: policyDoc.id,
      ...policyDoc.data()
    };
  } catch (error) {
    console.error('Error getting policy:', error);
    throw error;
  }
};

/**
 * Get active policy by type
 * @param {string} policyType
 * @returns {Promise<Object|null>}
 */
export const getActivePolicyByType = async (policyType) => {
  try {
    const policiesRef = collection(db, POLICIES_COLLECTION);
    const q = query(
      policiesRef, 
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    // Find the most recent active policy of this type
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.type === policyType && data.isActive !== false) {
        return {
          id: docSnap.id,
          ...data
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting active policy:', error);
    throw error;
  }
};

/**
 * Create or update a policy
 * @param {Object} policyData
 * @param {string} policyId - Optional, if provided will update existing policy
 * @returns {Promise<string>} - Policy ID
 */
export const savePolicy = async (policyData, policyId = null) => {
  try {
    const now = serverTimestamp();
    
    if (policyId) {
      // Update existing policy
      const policyRef = doc(db, POLICIES_COLLECTION, policyId);
      await updateDoc(policyRef, {
        ...policyData,
        updatedAt: now
      });
      return policyId;
    } else {
      // Create new policy
      const policiesRef = collection(db, POLICIES_COLLECTION);
      const newPolicyRef = doc(policiesRef);
      
      await setDoc(newPolicyRef, {
        ...policyData,
        createdAt: now,
        updatedAt: now,
        isActive: policyData.isActive !== false // Default to active
      });
      
      return newPolicyRef.id;
    }
  } catch (error) {
    console.error('Error saving policy:', error);
    throw error;
  }
};

/**
 * Delete a policy
 * @param {string} policyId
 * @returns {Promise<void>}
 */
export const deletePolicy = async (policyId) => {
  try {
    const policyRef = doc(db, POLICIES_COLLECTION, policyId);
    await deleteDoc(policyRef);
  } catch (error) {
    console.error('Error deleting policy:', error);
    throw error;
  }
};

/**
 * Toggle policy active status
 * @param {string} policyId
 * @param {boolean} isActive
 * @returns {Promise<void>}
 */
export const togglePolicyStatus = async (policyId, isActive) => {
  try {
    const policyRef = doc(db, POLICIES_COLLECTION, policyId);
    await updateDoc(policyRef, {
      isActive,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error toggling policy status:', error);
    throw error;
  }
};

/**
 * Initialize default policies (for first-time setup)
 * @returns {Promise<void>}
 */
export const initializeDefaultPolicies = async () => {
  try {
    const policies = await getAllPolicies();
    if (policies.length > 0) {
      console.log('Policies already exist, skipping initialization');
      return;
    }

    const defaultPolicies = [
      {
        type: POLICY_TYPES.CANCELLATION_GUEST,
        title: 'Guest Cancellation Policy',
        content: `## Guest Cancellation Policy

### Cancellation Timeframes

**Full Refund:**
- Cancellations made 48 hours or more before check-in: 100% refund
- Cancellations made 7 days or more before check-in for long-term stays (28+ days): 100% refund

**Partial Refund:**
- Cancellations made between 24-48 hours before check-in: 50% refund
- Cancellations made less than 24 hours before check-in: No refund

**Special Circumstances:**
- Extenuating circumstances (natural disasters, medical emergencies) may qualify for full refunds
- Contact Getaways support for review of special circumstances

### Refund Processing
- Refunds are processed within 5-10 business days
- Refunds are returned to the original payment method
- Service fees are non-refundable`,
        isActive: true,
        appliesTo: ['guest'],
        version: '1.0'
      },
      {
        type: POLICY_TYPES.CANCELLATION_HOST,
        title: 'Host Cancellation Policy',
        content: `## Host Cancellation Policy

### Host Cancellation Rules

**Host-Initiated Cancellations:**
- Hosts should avoid cancellations as they negatively impact guest experience
- Cancellations may result in penalties and affect host ratings

**Penalties:**
- First cancellation: Warning and potential calendar blocking
- Multiple cancellations: Listing may be removed from search results
- Severe cases: Account suspension or termination

**Valid Reasons for Host Cancellation:**
- Property damage or safety issues
- Natural disasters or emergencies
- Double bookings (system error)
- Guest violations of house rules

### Compensation for Guests
- Getaways will help guests find alternative accommodations
- Hosts may be required to compensate guests for inconvenience
- Full refunds are processed automatically for host cancellations`,
        isActive: true,
        appliesTo: ['host'],
        version: '1.0'
      },
      {
        type: POLICY_TYPES.TERMS_CONDITIONS,
        title: 'Terms & Conditions',
        content: `## Terms & Conditions

### Account Responsibility
- Users must provide accurate and up-to-date information during registration
- Each account is for personal use only and must not be shared
- Users are responsible for maintaining account security

### Bookings & Payments
- Guests are responsible for completing payments for bookings
- Hosts must provide truthful information about listings, including rates, amenities, and availability
- All prices are in Philippine Peso (₱) unless otherwise stated

### User Conduct
- Users must treat all members with respect
- Harassment, offensive content, or illegal activity is strictly prohibited
- Violations may result in account suspension or termination

### Intellectual Property
- All content on Getaways, including images, text, and designs, is owned by Getaways or its users
- Users grant Getaways license to use their content for platform purposes

### Limitation of Liability
- Getaways is not responsible for disputes between guests and hosts, property damages, or personal injury
- Users use the platform at their own risk`,
        isActive: true,
        appliesTo: ['guest', 'host'],
        version: '1.0'
      },
      {
        type: POLICY_TYPES.HOST_RULES,
        title: 'Host Rules & Regulations',
        content: `## Host Rules & Regulations

### Listing Requirements
- All listings must be accurate and up-to-date
- Photos must accurately represent the property
- Pricing must be transparent with no hidden fees
- Availability calendars must be kept current

### Host Responsibilities
- Maintain property in safe and clean condition
- Respond to booking requests within 24 hours
- Provide accurate check-in instructions
- Be available for guest communication during stay

### Prohibited Activities
- False or misleading listings
- Discrimination based on race, religion, gender, or other protected characteristics
- Charging guests outside the platform
- Canceling confirmed bookings without valid reason

### Service Fees
- Hosts pay a 10% commission on each booking
- Commission is deducted from booking amount when earnings are released
- Fees are non-refundable`,
        isActive: true,
        appliesTo: ['host'],
        version: '1.0'
      },
      {
        type: POLICY_TYPES.GUEST_RULES,
        title: 'Guest Rules & Regulations',
        content: `## Guest Rules & Regulations

### Booking Requirements
- Guests must be 18 years or older to book
- Accurate guest count must be provided
- Special requests should be communicated before booking

### Guest Responsibilities
- Respect the property and host's rules
- Leave property in good condition
- Report any issues immediately to the host
- Follow check-in and check-out procedures

### Prohibited Activities
- Bringing unauthorized guests
- Smoking in non-smoking properties
- Hosting parties or events without permission
- Damaging property or violating house rules

### Payment & Refunds
- Full payment is required at booking confirmation
- Refunds follow the cancellation policy
- Service fees are non-refundable`,
        isActive: true,
        appliesTo: ['guest'],
        version: '1.0'
      },
      {
        type: POLICY_TYPES.REFUND_POLICY,
        title: 'Refund Policy',
        content: `## Refund Policy

### Refund Eligibility
- Refunds are processed according to the cancellation policy
- Service fees are non-refundable
- Processing time: 5-10 business days

### Refund Methods
- Refunds are returned to the original payment method
- E-wallet refunds: Processed within 3-5 business days
- Credit card refunds: May take 7-10 business days to appear

### Non-Refundable Items
- Service fees
- Processing fees
- Completed bookings (unless canceled per policy)

### Dispute Resolution
- Contact Getaways support for refund disputes
- All disputes are reviewed within 48 hours
- Final decisions are made by Getaways administration`,
        isActive: true,
        appliesTo: ['guest', 'host'],
        version: '1.0'
      },
      {
        type: POLICY_TYPES.COMMUNITY_STANDARDS,
        title: 'Community Standards',
        content: `## Community Standards

### Respect & Inclusion
- Treat all members with respect and dignity
- No discrimination or harassment of any kind
- Foster an inclusive and welcoming environment

### Safety
- Report safety concerns immediately
- Follow all local laws and regulations
- Maintain safe and secure properties

### Honesty
- Provide accurate information
- Communicate clearly and honestly
- Honor commitments and agreements

### Privacy
- Respect others' privacy
- Do not share personal information without consent
- Follow data protection guidelines`,
        isActive: true,
        appliesTo: ['guest', 'host'],
        version: '1.0'
      }
    ];

    // Create all default policies
    for (const policy of defaultPolicies) {
      await savePolicy(policy);
    }

    console.log('Default policies initialized');
  } catch (error) {
    console.error('Error initializing default policies:', error);
    throw error;
  }
};

/**
 * Get all active FAQs
 * @returns {Promise<Array>} Array of FAQ objects with question and answer
 */
export const getActiveFAQs = async () => {
  try {
    const policiesRef = collection(db, POLICIES_COLLECTION);
    const q = query(
      policiesRef,
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const faqs = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // FAQs are stored as policies with type 'faq'
      // They should have 'question' and 'content' (answer) fields
      if (data.type === POLICY_TYPES.FAQ && data.isActive !== false) {
        faqs.push({
          id: doc.id,
          question: data.title || data.question || 'Question',
          answer: data.content || data.answer || '',
          order: data.order || 0
        });
      }
    });
    
    // Sort by order field if available, otherwise by updatedAt
    faqs.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return 0;
    });
    
    return faqs;
  } catch (error) {
    console.error('Error getting FAQs:', error);
    return [];
  }
};

