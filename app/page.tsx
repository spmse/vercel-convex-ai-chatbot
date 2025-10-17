import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing-hero";
import { NewsletterSignup } from "@/components/newsletter-signup";
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
      <Roadmap />
      <footer className="border-t py-8 text-center text-muted-foreground text-xs">
        © {new Date().getFullYear()} BrAIn. All rights reserved.
      </footer>
    </main>
  );
}
