"use client";
/**
 * FeatureHighlights Component
 * Add or edit feature objects in the `features` array below.
 * Place screenshots under `public/images` and reference their path with the `image` field.
 * Keep images lightweight to reduce CLS.
 */
import {
  Code,
  FileText,
  GitBranch,
  ImageIcon,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Small data structure so it's easy to extend.
type FeatureItem = {
  title: string;
  description: string;
  image?: string; // path under /public/images
  icon: React.ReactNode;
  badge?: string;
};

const features: FeatureItem[] = [
  {
    title: "Multimodal Chat",
    description:
      "Combine text, code, tables and images in a single AI conversation.",
    image: "/images/demo-thumbnail.png",
    icon: <MessageSquare className="h-5 w-5" />,
    badge: "Chat",
  },
  {
    title: "Code Editing",
    description:
      "Inline diff view & syntax highlighting to iterate with the model.",
    icon: <Code className="h-5 w-5" />,
    badge: "Code",
  },
  {
    title: "Image Understanding",
    description:
      "Send screenshots, diagrams or artworks and ask clarifying questions.",
    image: "/images/mouth-of-the-seine-monet.jpg",
    icon: <ImageIcon className="h-5 w-5" />,
    badge: "Vision",
  },
  {
    title: "Smart Artifacts",
    description:
      "Persist model outputs as live documents, code blocks or sheets.",
    icon: <FileText className="h-5 w-5" />,
    badge: "Artifacts",
  },
  {
    title: "Conversation Branching",
    description:
      "Explore multiple solution paths without losing prior context.",
    icon: <GitBranch className="h-5 w-5" />,
    badge: "Flow",
  },
  {
    title: "Adaptive Suggestions",
    description: "Context-aware actions that accelerate prompt building.",
    icon: <Sparkles className="h-5 w-5" />,
    badge: "Assist",
  },
];

export function FeatureHighlights({ className }: { className?: string }) {
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-4 py-12", className)}>
      <div className="mb-10 space-y-3 text-center">
        <Badge className="uppercase tracking-wide" variant="secondary">
          Features
        </Badge>
        <h2 className="font-bold text-3xl tracking-tight md:text-4xl">
          Powerful building blocks
        </h2>
        <p className="mx-auto max-w-2xl text-muted-foreground text-sm md:text-base">
          Everything you need to prototype, iterate and ship AI-driven
          experiences fast.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {features.map((f) => (
          <Card
            className="group relative overflow-hidden border-muted/30"
            key={f.title}
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-muted p-2 text-muted-foreground transition-shadow group-hover:shadow-sm">
                  {f.icon}
                </div>
                {f.badge && (
                  <Badge className="text-xs" variant="outline">
                    {f.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="font-semibold text-lg leading-tight">
                {f.title}
              </CardTitle>
            </CardHeader>
            {f.image && (
              <div className="px-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                  <Image
                    alt={f.title}
                    className="object-cover"
                    fill
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML =
                          '<div class="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Image unavailable</div>';
                      }
                    }}
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    src={f.image}
                  />
                </div>
              </div>
            )}
            <CardContent className="pt-4">
              <p className="line-clamp-4 text-muted-foreground text-sm leading-relaxed">
                {f.description}
              </p>
            </CardContent>
            <Separator className="opacity-0 transition-opacity group-hover:opacity-100" />
          </Card>
        ))}
      </div>
    </section>
  );
}

export default FeatureHighlights;
