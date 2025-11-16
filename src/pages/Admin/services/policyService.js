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
  serverTimestamp,
  onSnapshot,
  where
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
    let snapshot;
    
    try {
      // Try to get policies ordered by updatedAt
      const q = query(policiesRef, orderBy('updatedAt', 'desc'));
      snapshot = await getDocs(q);
    } catch (orderError) {
      // If orderBy fails (e.g., no documents or missing field), get all without ordering
      console.warn('Could not order by updatedAt, fetching all policies:', orderError);
      snapshot = await getDocs(policiesRef);
    }
    
    const policies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort manually if we couldn't use orderBy
    if (policies.length > 0 && policies[0].updatedAt) {
      policies.sort((a, b) => {
        const aDate = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
        const bDate = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
        return bDate - aDate;
      });
    }
    
    return policies;
  } catch (error) {
    console.error('Error getting policies:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
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
export const initializeDefaultPolicies = async (force = false) => {
  try {
    const policies = await getAllPolicies();
    
    // Check if specific policy types already exist
    const existingTypes = new Set(policies.map(p => p.type));
    
    // If all default policy types exist and force is false, skip
    const defaultPolicyTypes = [
      POLICY_TYPES.CANCELLATION_GUEST,
      POLICY_TYPES.CANCELLATION_HOST,
      POLICY_TYPES.TERMS_CONDITIONS,
      POLICY_TYPES.PRIVACY_POLICY,
      POLICY_TYPES.HOST_RULES,
      POLICY_TYPES.GUEST_RULES,
      POLICY_TYPES.REFUND_POLICY,
      POLICY_TYPES.COMMUNITY_STANDARDS
    ];
    
    const allExist = defaultPolicyTypes.every(type => existingTypes.has(type));
    
    if (allExist && !force) {
      console.log('All default policies already exist, skipping initialization');
      return {
        created: 0,
        skipped: policies.length,
        createdPolicies: [],
        skippedPolicies: defaultPolicyTypes.map(type => {
          const policy = policies.find(p => p.type === type);
          return policy ? policy.title : type;
        })
      };
    }

    const defaultPolicies = [
      {
        type: POLICY_TYPES.CANCELLATION_GUEST,
        title: 'Guest Cancellation Policy',
        content: `## Guest Cancellation Policy

### Cancellation Rules

**Full Refund (100%):**
- Cancellations of pending bookings: Full refund of the booking amount
- Refunds are processed instantly to your GetPay wallet

**Partial Refund (50%):**
- Cancellations of confirmed bookings: 50% refund of the booking amount
- The refund is automatically deducted from the host's wallet and credited to your GetPay wallet
- Refunds are processed instantly upon cancellation

**No Refund:**
- Completed bookings cannot be cancelled
- Cancelled bookings cannot be refunded again

**Special Circumstances:**
- Extenuating circumstances (natural disasters, medical emergencies) may qualify for full refunds
- Contact Getaways support for review of special circumstances

### Refund Processing
- Refunds are processed instantly to your GetPay wallet
- For confirmed bookings, refunds are automatically transferred from the host's wallet
- You can use your GetPay wallet balance for future bookings or withdraw funds
- No service fees are charged to guests`,
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
- Host cancellations are strongly discouraged

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
- Full refunds are processed automatically for host cancellations
- Refunds are instantly credited to guest's GetPay wallet
- Hosts may be required to compensate guests for inconvenience

### Impact on Earnings
- If earnings were already released, host may be required to return funds
- Commission (10%) may still be retained by platform`,
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
- Users must be 18 years or older to use the platform

### Bookings & Payments
- **Payment System**: All payments are processed through GetPay wallet system
- **Guest Payments**: Guests pay the full booking amount (no additional service fees)
- **Payment Timing**: Full payment is required when booking is confirmed by host
- **Payment Method**: Payments are processed through GetPay wallet or PayPal
- Hosts must provide truthful information about listings, including rates, amenities, and availability
- All prices are in Philippine Peso (₱) unless otherwise stated

### Earnings & Commissions
- **Host Earnings**: Hosts receive 90% of the booking amount
- **Platform Commission**: Getaways retains 10% commission on each booking
- **Earnings Release**: Earnings are released to host's GetPay wallet after booking completion
- **Release Timing**: Earnings are available for release when guest marks booking as completed or 1 day after checkout
- Commission is deducted when earnings are released to host

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
- Confirm or decline booking requests promptly

### Prohibited Activities
- False or misleading listings
- Discrimination based on race, religion, gender, or other protected characteristics
- Charging guests outside the platform
- Canceling confirmed bookings without valid reason

### Payment & Earnings
- **Commission Structure**: Hosts pay a 10% commission on each booking
- **Host Receives**: 90% of the booking amount
- **Payment Flow**: 
  - Guest pays full booking amount to admin wallet when booking is confirmed
  - Earnings are released to host's GetPay wallet after booking completion
  - Commission (10%) is automatically deducted when earnings are released
- **Earnings Release**: Earnings become available when guest marks booking as completed or 1 day after checkout
- **GetPay Wallet**: All earnings are deposited directly to your GetPay wallet
- Commission fees are non-refundable`,
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
- Payments are processed through GetPay wallet system
- Refunds follow the cancellation policy:
  - Pending bookings: Full refund (100%)
  - Confirmed bookings: Partial refund (50%)
- All refunds are processed instantly to your GetPay wallet
- No service fees are charged to guests`,
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
- Pending bookings: Full refund (100%)
- Confirmed bookings: Partial refund (50%)
- Completed bookings: No refunds available

### Refund Processing
- **Instant Processing**: All refunds are processed instantly to your GetPay wallet
- **No Processing Fees**: No additional fees are charged for refunds
- **Automatic Transfer**: For confirmed bookings, refunds are automatically transferred from the host's wallet to your wallet

### Refund Methods
- All refunds are credited to your GetPay wallet balance
- You can use your wallet balance for future bookings
- You can withdraw funds from your GetPay wallet at any time
- No service fees are charged to guests

### Non-Refundable Items
- Completed bookings cannot be refunded
- Once a booking is completed, no refunds are available

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
      },
      {
        type: POLICY_TYPES.PRIVACY_POLICY,
        title: 'Privacy Policy',
        content: `## Privacy Policy

### Information We Collect

**Personal Data:**
- Name, email address, password, contact information
- Profile details and preferences
- Payment information (processed securely through GetPay wallet and PayPal)

**Booking Data:**
- Listings viewed and searched
- Bookings made and cancelled
- Reviews and ratings posted
- Communication with hosts/guests

**Device & Usage Data:**
- IP address, browser type, device information
- Activity logs and platform usage patterns
- Location data (when using location-based features)

### How We Use Your Information

- To provide and improve our services
- To process bookings and payments through GetPay wallet system
- To communicate booking confirmations, updates, and promotions
- To detect and prevent fraud or unauthorized activity
- To personalize your experience on the platform
- To comply with legal obligations

### Data Sharing

- **We do not sell your personal data**
- Data may be shared with hosts for booking purposes (name, contact info, booking details)
- Data may be shared with payment processors (PayPal, GetPay) for transaction handling
- Data may be shared with service providers who assist in platform operations
- Data may be disclosed if required by law or to protect rights and safety

### Your Rights

- **Access**: View your personal information via account settings
- **Correction**: Update or correct your personal information at any time
- **Deletion**: Request deletion of your account and personal data
- **Opt-out**: Unsubscribe from marketing communications at any time
- **Data Portability**: Request a copy of your data

### Security

- Getaways implements industry-standard security measures to protect your data
- Payment information is encrypted and processed securely
- GetPay wallet transactions are secured through Firebase authentication
- Regular security audits and updates are performed

### Cookies & Tracking

- We may use cookies and tracking technologies to enhance user experience
- Cookies help analyze platform usage and improve services
- You can manage cookie preferences through your browser settings

### Data Retention

- We retain your data for as long as your account is active
- Booking and transaction data may be retained for legal and accounting purposes
- You can request data deletion at any time through account settings

### Contact Us

- For privacy concerns or data requests, contact Getaways support
- All privacy requests are reviewed within 48 hours`,
        isActive: true,
        appliesTo: ['guest', 'host'],
        version: '1.0'
      }
    ];

    // Create all default policies (only create if they don't exist)
    const createdPolicies = [];
    const skippedPolicies = [];
    
    for (const policy of defaultPolicies) {
      // Only create if this policy type doesn't exist yet
      if (!existingTypes.has(policy.type)) {
        try {
          const policyId = await savePolicy(policy);
          createdPolicies.push({ title: policy.title, id: policyId });
          console.log(`✅ Created default policy: ${policy.title} (ID: ${policyId})`);
        } catch (saveError) {
          console.error(`❌ Failed to create policy ${policy.title}:`, saveError);
          throw new Error(`Failed to create policy "${policy.title}": ${saveError.message}`);
        }
      } else {
        skippedPolicies.push(policy.title);
        console.log(`⏭️ Policy type ${policy.type} (${policy.title}) already exists, skipping`);
      }
    }

    console.log(`✅ Default policies initialization completed. Created: ${createdPolicies.length}, Skipped: ${skippedPolicies.length}`);
    
    if (createdPolicies.length === 0 && skippedPolicies.length > 0) {
      console.log('ℹ️ All default policies already exist');
    }
    
    return {
      created: createdPolicies.length,
      skipped: skippedPolicies.length,
      createdPolicies,
      skippedPolicies
    };
  } catch (error) {
    console.error('Error initializing default policies:', error);
    throw error;
  }
};

/**
 * Subscribe to active policies by type with real-time updates
 * @param {Array<string>} policyTypes - Array of policy types to listen to
 * @param {Function} callback - Callback function that receives updated policies object
 * @returns {Function} Unsubscribe function
 */
export const subscribeToActivePolicies = (policyTypes, callback) => {
  try {
    const policiesRef = collection(db, POLICIES_COLLECTION);
    // Get all policies and filter client-side since Firestore doesn't support != false queries well
    const q = query(
      policiesRef,
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const allPolicies = {};
      
      // Group policies by type, keeping only the most recent active one
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Filter for active policies and matching types
        if (data.isActive !== false && policyTypes.includes(data.type)) {
          // Only keep the most recent policy of each type
          if (!allPolicies[data.type] || 
              (!allPolicies[data.type].updatedAt || 
               (data.updatedAt && data.updatedAt.toMillis() > allPolicies[data.type].updatedAt.toMillis()))) {
            allPolicies[data.type] = {
              id: docSnap.id,
              ...data
            };
          }
        }
      });

      callback(allPolicies);
    }, (error) => {
      console.error('Error subscribing to policies:', error);
      callback({});
    });
  } catch (error) {
    console.error('Error setting up policy subscription:', error);
    return () => {}; // Return empty unsubscribe function
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


