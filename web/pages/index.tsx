import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import QuickStart from '../components/QuickStart';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
      <Header />
      <main className="overflow-x-hidden"> {/* Add overflow-x-hidden to prevent horizontal scrolling on mobile */}
        <Hero />
        <Features />
        <QuickStart />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}