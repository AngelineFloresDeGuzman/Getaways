import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";

const validatePassword = (password) => {
  const minLength = /.{8,}/;
  const uppercase = /[A-Z]/;
  const lowercase = /[a-z]/;
  const number = /[0-9]/;
  const specialChar = /[!@#$%^&*]/;

  if (!minLength.test(password)) return "Password must be at least 8 characters.";
  if (!uppercase.test(password)) return "Password must contain at least one uppercase letter.";
  if (!lowercase.test(password)) return "Password must contain at least one lowercase letter.";
  if (!number.test(password)) return "Password must contain at least one number.";
  if (!specialChar.test(password)) return "Password must contain at least one special character.";

  return null;
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState({ message: "", type: "" });

  const oobCode = searchParams.get("oobCode"); // from URL

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const errorMsg = validatePassword(password);
    if (errorMsg) {
      showToast(errorMsg, "error");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, password);
      showToast("Password successfully updated!", "success");
      setTimeout(() => navigate("/login"), 2000); // redirect to login
    } catch (err) {
      showToast("Failed to reset password. Link may be expired.", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Reset Your Password</h1>
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded"
            required
          />
          <button type="submit" className="w-full bg-primary text-white py-3 rounded">Reset Password</button>
        </form>
        {toast.message && (
          <div className={`mt-4 p-3 rounded text-white ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
