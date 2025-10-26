// Firestore draft listing management for onboarding
import { doc, setDoc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Create or get a draft listing for a host
export async function getOrCreateDraft(userId, listingId = null) {
  // If listingId is provided, use it; else, create new for multiple listings per host
  if (listingId) {
    const draftRef = doc(db, "listings", listingId);
    const draftSnap = await getDoc(draftRef);
    if (!draftSnap.exists()) {
      await setDoc(draftRef, {
        hostId: userId,
        status: "draft",
        step: "propertydetails",
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return draftRef;
  } else {
    // Multiple listings per host
    const newDoc = await addDoc(collection(db, "listings"), {
      hostId: userId,
      status: "draft",
      step: "propertydetails",
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return doc(db, "listings", newDoc.id);
  }
}

// Save draft progress (auto-save or manual)
export async function saveDraft(listingRef, formData, currentStep) {
  // Get current listing data to preserve category and createdAt
  const snap = await getDoc(listingRef);
  const currentData = snap.exists() ? snap.data() : {};
  await updateDoc(listingRef, {
    data: {
      ...currentData.data,
      ...formData,
    },
    step: currentStep,
    status: "draft",
    category: currentData.category ?? formData.category ?? null,
    createdAt: currentData.createdAt ?? new Date(),
    updatedAt: new Date(),
  });
}

// Restore draft progress for onboarding
export async function restoreDraft(userId, listingId) {
  const draftRef = doc(db, "listings", listingId);
  const draftSnap = await getDoc(draftRef);
  if (draftSnap.exists() && draftSnap.data().status === "draft") {
    const { step, data } = draftSnap.data();
    return { step, data };
  }
  return null;
}

// Publish listing (mark as live)
export async function publishListing(listingRef) {
  await updateDoc(listingRef, {
    status: "published",
    updatedAt: new Date(),
  });
}
