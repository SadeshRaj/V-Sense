import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import Login from './Login';

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
            <Navbar onOpenLogin={() => setIsLoginOpen(true)} />
            <main className="flex-grow">
                <Hero onOpenLogin={() => setIsLoginOpen(true)} />
                <Features />
                <HowItWorks />
            </main>
            <Footer />

            {/* Login Popup */}
            <Login
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
            />
        </div>
    );
}