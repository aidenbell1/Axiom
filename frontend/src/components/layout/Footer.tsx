// src/components/layout/Footer.tsx
import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-neutral-200 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-lg font-bold text-primary-600">
              Axiom
            </Link>
            <p className="text-sm text-neutral-500 mt-1">
              &copy; {new Date().getFullYear()} Axiom Quantitative Investment Platform
            </p>
          </div>
          
          <div className="flex space-x-6">
            <Link href="/about" className="text-sm text-neutral-600 hover:text-primary-600">
              About
            </Link>
            <Link href="/privacy" className="text-sm text-neutral-600 hover:text-primary-600">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-neutral-600 hover:text-primary-600">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-neutral-600 hover:text-primary-600">
              Contact
            </Link>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
          <p>
            Axiom is a platform for educational and informational purposes only. 
            Past performance is not indicative of future results. 
            Trading carries significant risk and you should only trade with funds you can afford to lose.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;