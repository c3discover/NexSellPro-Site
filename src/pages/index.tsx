/**
 * @fileoverview Home page component for NexSellPro website
 * @author NexSellPro
 * @created 2024-03-27
 * @lastModified 2024-03-27
 */

////////////////////////////////////////////////
// Imports:
////////////////////////////////////////////////
import { type NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import { useState, useEffect } from 'react';

////////////////////////////////////////////////
// Types and Interfaces:
////////////////////////////////////////////////
// No additional types needed for this page

////////////////////////////////////////////////
// Constants:
////////////////////////////////////////////////
const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/features', label: 'Features' },
  { href: '/faqs', label: 'FAQs' },
  { href: '/contact', label: 'Contact' },
];

////////////////////////////////////////////////
// Page Component:
////////////////////////////////////////////////
const Home: NextPage = () => {
  ////////////////////////////////////////////////
  // State and Hooks:
  ////////////////////////////////////////////////
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  ////////////////////////////////////////////////
  // Data Fetching:
  ////////////////////////////////////////////////
  // No data fetching needed for this page
  // export async function getStaticProps() {}
  // export async function getServerSideProps() {}

  ////////////////////////////////////////////////
  // Event Handlers:
  ////////////////////////////////////////////////
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  ////////////////////////////////////////////////
  // Helper Functions:
  ////////////////////////////////////////////////
  const renderNavItems = (isMobile = false) => {
    return NAV_ITEMS.map(({ href, label }) => (
      <a
        key={href}
        href={href}
        className={`${
          isMobile
            ? 'block px-3 py-2 rounded-md text-neutral-dark hover:text-primary hover:bg-secondary'
            : 'text-neutral-dark hover:text-primary transition-colors'
        }`}
      >
        {label}
      </a>
    ));
  };

  ////////////////////////////////////////////////
  // Render Methods:
  ////////////////////////////////////////////////
  return (
    <>
      <Head>
        <title>NexSellPro - Maximize Your Walmart Profits</title>
        <meta 
          name="description" 
          content="Streamline your Walmart business operations and boost profitability with NexSellPro's powerful Chrome extension." 
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Header/Navigation */}
      <header className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled ? 'glass shadow-lg' : 'bg-transparent'
      }`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <a href="/" className="h-8 w-auto relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <Image
                src="/assets/color-logo.svg"
                alt="NexSellPro Logo"
                width={160}
                height={40}
                className="object-contain relative"
                priority
              />
            </a>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {NAV_ITEMS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-white/80 hover:text-white transition-all hover-underline"
              >
                {label}
              </a>
            ))}
            <a 
              href="#early-access" 
              className="btn-accent group"
            >
              <span className="relative z-10 flex items-center">
                Get Early Access
                <svg className="w-4 h-4 ml-2 transform transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all"
            onClick={toggleMobileMenu}
            aria-label="Navigation Menu"
          >
            <span className="sr-only">Navigation Menu</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Menu */}
        <div 
          className={`md:hidden fixed inset-x-0 top-20 transition-all duration-500 transform ${
            isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
        >
          <div className="glass shadow-lg border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 pt-4 pb-6 space-y-3">
              {NAV_ITEMS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="block px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                >
                  {label}
                </a>
              ))}
              <a 
                href="#early-access" 
                className="block w-full text-center btn-accent"
              >
                <span className="relative z-10">Get Early Access</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="bg-neutral-dark">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-rgb),0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(var(--primary-rgb),0.15),transparent_50%)]"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="text-center lg:text-left pt-16 lg:pt-0">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight animate-slideDown">
                  <span className="text-white">Maximize Your</span>
                  <br />
                  <span className="gradient-text animate-glow">
                    Walmart Profits
                  </span>
                </h1>
                <p className="text-lg md:text-xl mb-6 text-white/80 animate-slideUp delay-200">
                  Join the hundreds of sellers streamlining their operations and boosting profitability with ease.
                </p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start animate-fadeIn delay-500">
                  <a
                    href="#early-access"
                    className="btn-accent group"
                  >
                    <span className="relative z-10 flex items-center">
                      Try For Free!
                      <svg className="w-5 h-5 ml-2 transform transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </a>
                </div>
                <p className="text-sm mt-3 text-white/60 animate-fadeIn delay-700">*Limited Spots Available, So Act Now</p>
              </div>
              <div className="relative h-[400px] lg:h-[370px] hidden lg:block">
                {/* Main container with enhanced shadow */}
                <div className="absolute inset-0 transform perspective-[1500px] hover:scale-[1.02] transition-transform duration-500 origin-center hover:rotate-y-3">
                  {/* Shadow layers for depth */}
                  <div className="absolute inset-0 -bottom-12 blur-3xl bg-accent/20 scale-95"
                    style={{
                      clipPath: 'path("M 0,60 C 30,60 40,0 100,0 C 160,0 170,60 200,60 C 230,60 240,30 270,30 C 300,30 300,60 330,60 C 360,60 380,30 400,30 C 420,30 420,60 450,60 L 450,340 C 420,340 420,370 400,370 C 380,370 360,340 330,340 C 300,340 300,370 270,370 C 240,370 230,340 200,340 C 170,340 160,400 100,400 C 40,400 30,340 0,340 Z")',
                      transform: 'translateZ(-50px) translateY(20px) rotateX(10deg)',
                    }}
                  ></div>
                  <div className="absolute inset-0 -bottom-8 blur-2xl bg-primary/20 scale-[0.97]"
                    style={{
                      clipPath: 'path("M 0,60 C 30,60 40,0 100,0 C 160,0 170,60 200,60 C 230,60 240,30 270,30 C 300,30 300,60 330,60 C 360,60 380,30 400,30 C 420,30 420,60 450,60 L 450,340 C 420,340 420,370 400,370 C 380,370 360,340 330,340 C 300,340 300,370 270,370 C 240,370 230,340 200,340 C 170,340 160,400 100,400 C 40,400 30,340 0,340 Z")',
                      transform: 'translateZ(-30px) translateY(12px) rotateX(10deg)',
                    }}
                  ></div>

                  {/* Main video container with cloud shape */}
                  <div className="relative w-full h-full" style={{
                    clipPath: 'path("M 0,60 C 30,60 40,0 100,0 C 160,0 170,60 200,60 C 230,60 240,30 270,30 C 300,30 300,60 330,60 C 360,60 380,30 400,30 C 420,30 420,60 450,60 L 450,340 C 420,340 420,370 400,370 C 380,370 360,340 330,340 C 300,340 300,370 270,370 C 240,370 230,340 200,340 C 170,340 160,400 100,400 C 40,400 30,340 0,340 Z")',
                    transform: 'translateZ(0) rotateX(10deg)',
                    transformStyle: 'preserve-3d'
                  }}>
                    {/* Enhanced 3D shadow layers */}
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="absolute inset-0 bg-accent/10"
                        style={{
                          clipPath: 'path("M 0,60 C 30,60 40,0 100,0 C 160,0 170,60 200,60 C 230,60 240,30 270,30 C 300,30 300,60 330,60 C 360,60 380,30 400,30 C 420,30 420,60 450,60 L 450,340 C 420,340 420,370 400,370 C 380,370 360,340 330,340 C 300,340 300,370 270,370 C 240,370 230,340 200,340 C 170,340 160,400 100,400 C 40,400 30,340 0,340 Z")',
                          transform: `translate(${(i + 1) * 4}px, ${(i + 1) * 4}px) translateZ(-${(i + 1) * 10}px)`,
                          filter: 'blur(8px)',
                          opacity: 0.3 - i * 0.1
                        }}
                      ></div>
                    ))}
                    
                    {/* Animated gradient border */}
                    <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent animate-shimmer"
                      style={{
                        clipPath: 'path("M 0,60 C 30,60 40,0 100,0 C 160,0 170,60 200,60 C 230,60 240,30 270,30 C 300,30 300,60 330,60 C 360,60 380,30 400,30 C 420,30 420,60 450,60 L 450,340 C 420,340 420,370 400,370 C 380,370 360,340 330,340 C 300,340 300,370 270,370 C 240,370 230,340 200,340 C 170,340 160,400 100,400 C 40,400 30,340 0,340 Z")'
                      }}
                    ></div>
                    
                    {/* Video container */}
                    <div className="absolute inset-[2px] overflow-hidden bg-neutral-dark"
                      style={{
                        clipPath: 'path("M 0,60 C 30,60 40,0 100,0 C 160,0 170,60 200,60 C 230,60 240,30 270,30 C 300,30 300,60 330,60 C 360,60 380,30 400,30 C 420,30 420,60 450,60 L 450,340 C 420,340 420,370 400,370 C 380,370 360,340 330,340 C 300,340 300,370 270,370 C 240,370 230,340 200,340 C 170,340 160,400 100,400 C 40,400 30,340 0,340 Z")'
                      }}
                    >
                      <video
                        src="/assets/Screenshares/Cover.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain transform translate-z-0"
                      />
                    </div>
                  </div>

                  {/* Enhanced decorative accents with more glow */}
                  <div className="absolute -right-6 -top-6 w-16 h-16 bg-accent/40 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -left-4 bottom-8 w-12 h-12 bg-primary/40 rounded-full blur-2xl animate-pulse delay-300"></div>
                  <div className="absolute right-1/4 -bottom-4 w-14 h-14 bg-accent/30 rounded-full blur-2xl animate-pulse delay-700"></div>
                  
                  {/* Floating particles with enhanced glow */}
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-accent/60 rounded-full animate-float blur-sm"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.5}s`,
                          animationDuration: '3s'
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="relative py-32" id="features">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-dark/50 to-neutral-dark"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(var(--accent-rgb),0.15),transparent_50%)]"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20 animate-slideDown">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 gradient-text animate-glow">
                Why NexSellPro?
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                NexSellPro simplifies the process of selling on Walmart. With our powerful tools, sellers save time, increase profitability, and make data-driven decisions—all in one intuitive platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                { title: 'TIME SAVINGS', value: '80%', desc: 'Faster Product Analysis' },
                { title: 'ACCURACY', value: '90%', desc: 'Accurate Profitability Estimates' },
                { title: 'PRODUCTIVITY', value: '50%', desc: 'Fewer Manual Tasks' }
              ].map((stat, index) => (
                <div key={stat.title} 
                  className="card group animate-fadeIn"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="relative">
                    <div className="text-6xl font-bold gradient-text animate-glow mb-6">
                      {stat.value}
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-white group-hover:text-accent transition-colors">
                      {stat.title}
                    </h3>
                    <p className="text-white/60 group-hover:text-white/80 transition-colors">
                      {stat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl animate-pulse-slow"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-bold gradient-text animate-glow mb-8">
              Ready to Grow Your Business?
            </h2>
            <a
              href="#early-access"
              className="btn-accent group inline-flex items-center"
            >
              <span className="relative z-10 flex items-center">
                Get Started Today!
                <svg className="w-5 h-5 ml-2 transform transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
            <p className="mt-6 text-white/60">Limited Spots Available!</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-16">
              <div className="col-span-2 md:col-span-2">
                <a href="/" className="block mb-8 group">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <Image
                      src="/assets/color-logo.svg"
                      alt="NexSellPro Logo"
                      width={140}
                      height={35}
                      className="relative"
                    />
                  </div>
                </a>
                <p className="text-white/60 max-w-md leading-relaxed">
                  Empowering Walmart sellers with powerful tools for better business decisions.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-6 text-lg text-white">Resources</h3>
                <ul className="space-y-4">
                  {['About', 'Contact', 'Resources'].map(item => (
                    <li key={item}>
                      <a href={`/${item.toLowerCase()}`} className="text-white/60 hover:text-accent transition-colors hover-underline">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-6 text-lg text-white">Legal</h3>
                <ul className="space-y-4">
                  {[
                    { label: 'Privacy Policy', path: 'privacy' },
                    { label: 'Terms of Service', path: 'terms' },
                    { label: 'FAQs', path: 'faqs' }
                  ].map(({ label, path }) => (
                    <li key={path}>
                      <a href={`/${path}`} className="text-white/60 hover:text-accent transition-colors hover-underline">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-white/60">
                © {new Date().getFullYear()} NexSellPro. All rights reserved.
              </p>
              <div className="mt-4 md:mt-0">
                <a 
                  href="https://twitter.com/share" 
                  className="inline-flex items-center text-white/60 hover:text-accent transition-colors group"
                >
                  <svg className="w-5 h-5 mr-2 transform transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="hover-underline">Share on X</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        :root {
          --primary-rgb: 45, 185, 185;
          --accent-rgb: 255, 107, 53;
        }
        
        body {
          background-color: #111827;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 1.2s ease-out forwards;
        }
        
        .animate-slideDown {
          animation: slideDown 1.2s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 1.2s ease-out forwards;
        }
        
        .delay-200 {
          animation-delay: 200ms;
        }
        
        .delay-300 {
          animation-delay: 300ms;
        }
        
        .delay-500 {
          animation-delay: 500ms;
        }
        
        .delay-700 {
          animation-delay: 700ms;
        }
        
        @keyframes numberCount {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-number {
          animation: numberCount 1s ease-out forwards;
          opacity: 0;
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 8s linear infinite;
        }
      `}</style>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .rotate-y-3 {
          transform: rotateY(3deg);
        }
      `}</style>
    </>
  );
};

////////////////////////////////////////////////
// Export:
////////////////////////////////////////////////
export default Home; 