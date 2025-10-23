import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const VerifyEmail = () => {
  const [status, setStatus] = useState("verifying");
  const navigate = useNavigate();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const mode = query.get("mode");
    const oobCode = query.get("oobCode");

    console.log("mode:", mode, "oobCode:", oobCode);

    if (mode === "verifyEmail" && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => setStatus("success"))
        .catch(() => setStatus("error"));
    } else {
      setStatus("error");
    }
  }, []);

  const getContent = () => {
    switch (status) {
      case "verifying":
        return (
          <>
            <Loader2 className="animate-spin text-sky-600 mx-auto mb-6" size={60} />
            <h1 className="text-3xl font-bold text-sky-700 mb-4">Verifying your email...</h1>
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
              className="bg-primary hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg transition transform hover:scale-105"
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
              className="bg-primary hover:bg-red-700 text-white px-8 py-3 rounded-lg text-lg transition transform hover:scale-105"
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
