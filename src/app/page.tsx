"use client";

import StarField from "@/components/landing/StarField";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FloatingCards from "@/components/landing/FloatingCards";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="cosmic-bg relative min-h-screen overflow-x-hidden">
      {/* Animated star background */}
      <StarField />

      {/* Glass navbar */}
      <Navbar />

      {/* Hero + Floating Cards overlay */}
      <section className="relative min-h-screen">
        <FloatingCards />
        <HeroSection />
      </section>

      {/* Scrollable sections */}
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
}
