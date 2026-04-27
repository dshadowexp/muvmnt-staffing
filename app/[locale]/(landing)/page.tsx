import {
  HeroSection,
  TrustBar,
  HowItWorksSection,
  BridgeSection,
  WhyUsSection,
  TestimonialsSection,
} from "@/app/[locale]/(landing)/_components/landing-sections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <HowItWorksSection />
      <BridgeSection />
      <WhyUsSection />
      <TestimonialsSection />
    </>
  );
}
