import {
  HeroSection,
  TrustBar,
  ServicesSection,
  HowItWorksSection,
  WhyUsSection,
  TestimonialsSection,
} from "@/app/[locale]/(landing)/_components/landing-sections";

/**
 * Home page — assembles all landing page sections.
 * Each section is a self-contained Server Component.
 * "use client" is pushed down only to interactive components.
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <ServicesSection />
      <HowItWorksSection />
      <WhyUsSection />
      <TestimonialsSection />
    </>
  );
}
