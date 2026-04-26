import {
  HeroSection,
  TrustBar,
  HowItWorksSection,
  ScreeningSection,
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
      <ScreeningSection />
      <TestimonialsSection />
    </>
  );
}
