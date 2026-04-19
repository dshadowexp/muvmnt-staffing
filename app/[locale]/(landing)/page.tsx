import {
  HeroSection,
  TrustBar,
  HowItWorksSection,
  WhyUsSection,
  TestimonialsSection,
} from "@/app/[locale]/(landing)/_components/landing-sections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <HowItWorksSection />
      <WhyUsSection />
      <TestimonialsSection />
    </>
  );
}
