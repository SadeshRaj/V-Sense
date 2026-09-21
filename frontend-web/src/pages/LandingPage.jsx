import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import Login from './Login';
import Register from './Register';

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
            <Navbar
                onOpenLogin={() => {
                    setIsRegisterOpen(false);
                    setIsLoginOpen(true);
                }}
                onOpenRegister={() => {
                    setIsLoginOpen(false);
                    setIsRegisterOpen(true);
                }}
            />
            <main className="flex-grow">
                <Hero
                    onOpenLogin={() => {
                        setIsRegisterOpen(false);
                        setIsLoginOpen(true);
                    }}
                />
                <Features />
                <HowItWorks />
            </main>
            <Footer />

            {/* Login Modal Popup */}
            <Login
                isOpen={isLoginOpen}
                isModal={true}
                onClose={() => setIsLoginOpen(false)}
            />

            {/* Register Partner Modal Popup */}
            <Register
                isOpen={isRegisterOpen}
                isModal={true}
                onClose={() => setIsRegisterOpen(false)}
            />
        </div>
    );
}