import React, { useState } from "react";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Eye, EyeOff, Mail, Phone } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
const LogIn = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleLogin = (e) => __awaiter(void 0, void 0, void 0, function* () {
        e.preventDefault();
        if (loginMethod !== 'email')
            return;
        try {
            const userCredential = yield signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            if (!user.emailVerified) {
                alert('Please verify your email first!');
                return;
            }
            // Successful login → redirect to Guest Index page
            navigate('/guest'); // <-- make sure your router points /guest to GuestIndex
        }
        catch (error) {
            alert(error.message);
        }
    });
    return (React.createElement("div", { className: "min-h-screen bg-background" },
        React.createElement(Navigation, { role: "guest", isLoggedIn: false }),
        React.createElement("section", { className: "pt-24 pb-20 px-6" },
            React.createElement("div", { className: "max-w-md mx-auto" },
                React.createElement("div", { className: "text-center mb-8 animate-fade-in" },
                    React.createElement("h1", { className: "font-heading text-3xl font-bold text-foreground mb-4" }, "Welcome back"),
                    React.createElement("p", { className: "font-body text-muted-foreground" }, "Sign in to your Havenly account")),
                React.createElement("div", { className: "card-listing animate-scale-in" },
                    React.createElement("div", { className: "p-8" },
                        React.createElement("div", { className: "flex rounded-xl bg-muted p-1 mb-6" },
                            React.createElement("button", { onClick: () => setLoginMethod('email'), className: `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${loginMethod === 'email'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'}` },
                                React.createElement(Mail, { className: "w-4 h-4" }),
                                "Email"),
                            React.createElement("button", { onClick: () => setLoginMethod('phone'), className: `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${loginMethod === 'phone'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'}` },
                                React.createElement(Phone, { className: "w-4 h-4" }),
                                "Phone")),
                        React.createElement("form", { className: "space-y-6", onSubmit: handleLogin },
                            React.createElement("div", null,
                                React.createElement("label", { className: "block font-medium text-foreground mb-2" }, loginMethod === 'email' ? 'Email address' : 'Phone number'),
                                React.createElement("input", { type: loginMethod === 'email' ? 'email' : 'tel', placeholder: loginMethod === 'email'
                                        ? 'Enter your email address'
                                        : 'Enter your phone number', className: "w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all", value: email, onChange: (e) => setEmail(e.target.value) })),
                            React.createElement("div", null,
                                React.createElement("label", { className: "block font-medium text-foreground mb-2" }, "Password"),
                                React.createElement("div", { className: "relative" },
                                    React.createElement("input", { type: showPassword ? 'text' : 'password', placeholder: "Enter your password", className: "w-full p-4 pr-12 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all", value: password, onChange: (e) => setPassword(e.target.value) }),
                                    React.createElement("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" }, showPassword ? (React.createElement(EyeOff, { className: "w-5 h-5" })) : (React.createElement(Eye, { className: "w-5 h-5" }))))),
                            React.createElement("div", { className: "flex items-center justify-between" },
                                React.createElement("label", { className: "flex items-center gap-2 cursor-pointer" },
                                    React.createElement("input", { type: "checkbox", className: "rounded border-border text-primary focus:ring-primary" }),
                                    React.createElement("span", { className: "text-sm text-muted-foreground" }, "Remember me")),
                                React.createElement("a", { href: "#", className: "text-sm text-primary hover:text-primary/80 font-medium transition-colors" }, "Forgot password?")),
                            React.createElement("button", { type: "submit", className: "w-full btn-primary text-lg py-4" }, "Sign In")),
                        React.createElement("div", { className: "mt-6" },
                            React.createElement("div", { className: "relative" },
                                React.createElement("div", { className: "absolute inset-0 flex items-center" },
                                    React.createElement("div", { className: "w-full border-t border-border" })),
                                React.createElement("div", { className: "relative flex justify-center text-sm" },
                                    React.createElement("span", { className: "px-4 bg-background text-muted-foreground" }, "Or continue with"))),
                            React.createElement("div", { className: "mt-6 grid grid-cols-2 gap-4" },
                                React.createElement("button", { className: "flex items-center justify-center gap-2 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors" },
                                    React.createElement("img", { src: "https://developers.google.com/identity/images/g-logo.png", alt: "Google", className: "w-5 h-5" }),
                                    React.createElement("span", { className: "text-sm font-medium" }, "Google")),
                                React.createElement("button", { className: "flex items-center justify-center gap-2 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors" },
                                    React.createElement("svg", { className: "w-5 h-5 text-[#1877F2]", fill: "currentColor", viewBox: "0 0 24 24" },
                                        React.createElement("path", { d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" })),
                                    React.createElement("span", { className: "text-sm font-medium" }, "Facebook")))),
                        React.createElement("div", { className: "mt-8 text-center" },
                            React.createElement("p", { className: "text-muted-foreground" },
                                "Don't have an account?",
                                ' ',
                                React.createElement("a", { href: "/signup", className: "text-primary hover:text-primary/80 font-medium transition-colors" }, "Sign up"))))))),
        React.createElement(Footer, null)));
};
export default LogIn;
