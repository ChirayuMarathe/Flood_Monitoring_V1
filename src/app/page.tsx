import HeroSection from '@/components/landing/Hero';
import Marquee from '@/components/landing/Marquee';
import CoreFeatures from '@/components/landing/CoreFeatures';
import WardShowcase from '@/components/landing/WardShowcase';
import ContactGrid from '@/components/landing/ContactGrid';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="bg-[#0A0A0A] min-h-screen overflow-x-hidden">
      <HeroSection />
      <CoreFeatures />
      <WardShowcase />
      <Marquee />
      <ContactGrid />
      <Footer />
    </main>
  );
}
