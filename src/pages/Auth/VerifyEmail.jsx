import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { verifyToken } from "@/lib/emailService";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const VerifyEmail = () => {
  const [status, setStatus] = useState("verifying");
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmailToken = async () => {
      const query = new URLSearchParams(window.location.search);
      const token = query.get("token");

      if (!token) {
        setStatus("error");
        return;
      }

      try {
        // Verify the token
        const result = await verifyToken(token);

        if (!result.valid) {
          setStatus("error");
          return;
        }

        // Update user's emailVerified status in Firestore
        const userDocRef = doc(db, "users", result.userId);
        await updateDoc(userDocRef, {
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        });

        // Also update Firebase Auth emailVerified status if user is logged in
        if (auth.currentUser && auth.currentUser.uid === result.userId) {
          await auth.currentUser.reload();
        }

        setStatus("success");
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    verifyEmailToken();
  }, []);

  const getContent = () => {
    switch (status) {
      case "verifying":
        return (
          <>
            <Loader2 className="animate-spin text-primary mx-auto mb-6" size={60} />
            <h1 className="text-3xl font-bold text-primary mb-4">Verifying your email...</h1>
            <p className="text-gray-700 text-lg">Please wait a moment while we confirm your verification.</p>
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle className="text-green-600 mx-auto mb-6" size={60} />
            <h1 className="text-3xl font-bold text-green-600 mb-4">Email Verified!</h1>
            <p className="text-gray-700 text-lg mb-6">
              Your email has been verified. You can now sign in to your Getaways account.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="bg-primary text-white px-8 py-3 rounded-lg text-lg transition transform hover:scale-105"
            >
              Go to Login
            </button>
          </>
        );
      case "error":
        return (
          <>
            <XCircle className="text-red-600 mx-auto mb-6" size={60} />
            <h1 className="text-3xl font-bold text-red-600 mb-4">Verification Failed</h1>
            <p className="text-gray-700 text-lg mb-6">Something went wrong. Please try verifying your email again.</p>
            <button
              onClick={() => navigate("/")}
              className="bg-primary text-white px-8 py-3 rounded-lg text-lg transition transform hover:scale-105"
            >
              Back to Home
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-white px-4">
      {/* Logo and Name */}
      <div className="flex flex-col items-center mb-12">
        <img src="/logo.jpg" alt="Getaways" className="h-20 w-20 mb-4" />
        <h1 className="text-4xl font-extrabold text-primary">Getaways</h1>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-12 text-center w-full max-w-xl transform transition duration-500">
        {getContent()}
      </div>
    </div>
  );
};

export default VerifyEmail;
