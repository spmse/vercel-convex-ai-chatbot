import { redirect } from "next/navigation";
import FeatureHighlights from "@/components/feature-highlights";
import { LandingHero } from "@/components/landing-hero";
import { Roadmap } from "@/components/roadmap";
import { auth } from "./(auth)/auth";

export default async function LandingOrApp() {
  const session = await auth();
  if (session) {
    redirect("/chat");
  }
  return (
    <main className="flex flex-col">
      <LandingHero />
      {/* <NewsletterSignup /> */}
      <FeatureHighlights />
      <Roadmap />
      <footer className="border-t py-8 text-center text-muted-foreground text-xs">
        © {new Date().getFullYear()} BrAIn. All rights reserved.
      </footer>
    </main>
  );
}
