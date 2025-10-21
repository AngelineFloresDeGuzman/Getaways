import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Test function to check if we can write to Firestore
 */
export const testFirestoreConnection = async () => {
  try {
    const user = auth.currentUser;
    console.log('🔍 Testing Firestore connection...');
    console.log('🔍 Current user:', user?.uid, user?.email);
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Test writing to onboardingDrafts collection
    const testData = {
      userId: user.uid,
      userEmail: user.email,
      testField: 'This is a test document',
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp()
    };

    const testDocId = `test_${user.uid}_${Date.now()}`;
    const testDocRef = doc(collection(db, 'onboardingDrafts'), testDocId);
    
    console.log('🔍 Attempting to write test document:', testDocId);
    await setDoc(testDocRef, testData);
    
    console.log('✅ Successfully wrote to onboardingDrafts collection!');
    console.log('📄 Document ID:', testDocId);
    
    return {
      success: true,
      docId: testDocId,
      message: 'Firestore connection successful'
    };
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    return {
      success: false,
      error: error.message,
      errorCode: error.code
    };
  }
};

/**
 * Test reading from the collection
 */
export const testFirestoreRead = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { getDocs, query, where } = await import('firebase/firestore');
    
    const draftsCollection = collection(db, 'onboardingDrafts');
    const q = query(draftsCollection, where('userId', '==', user.uid));
    
    console.log('🔍 Testing read from onboardingDrafts...');
    const querySnapshot = await getDocs(q);
    
    console.log('📖 Found', querySnapshot.size, 'documents');
    querySnapshot.forEach((doc) => {
      console.log('📄 Document:', doc.id, doc.data());
    });
    
    return {
      success: true,
      documentCount: querySnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Firestore read test failed:', error);
    return {
      success: false,
      error: error.message,
      errorCode: error.code
    };
  }
};

export default { testFirestoreConnection, testFirestoreRead };