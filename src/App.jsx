import React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index.jsx";
import NotFound from "@/pages/NotFound.jsx";
import Accommodations from "./pages/Guest/Accommodations";
import Services from "./pages/Guest/Services";
import Experiences from "./pages/Guest/Experiences";
import BecomeHost from "./pages/Host/BecomeHost";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import GuestIndex from "./pages/Guest/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/accommodations" element={<Accommodations />} />
            <Route path="/services" element={<Services />} />
            <Route path="/experiences" element={<Experiences />} />
            <Route path="/become-host" element={<BecomeHost />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/guest" element={<GuestIndex />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
