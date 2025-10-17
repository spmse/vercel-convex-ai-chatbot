"use client";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";

const slogans = [
  "Chat. Create. Collaborate.",
  "Your AI workspace evolves with you.",
  "Agents that adapt.",
  "Customize models. Or bring your own.",
  "Build multiplayer AI experiences.",
];

export function LandingHero() {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slogans.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 pt-24 text-center md:pt-40">
      <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1 text-xs backdrop-blur">
        <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
        <span>Early Developer Preview</span>
      </div>
      <h1 className="font-bold text-4xl leading-tight tracking-tight md:text-6xl">
        The second{" "}
        <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 bg-clip-text text-transparent">
          BrAIn
        </span>
        <br /> for product teams & creators
      </h1>
      <div className="relative h-10 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex items-center justify-center font-mono text-sm md:text-lg"
            exit={{ opacity: 0, y: -12 }}
            initial={{ opacity: 0, y: 20 }}
            key={index}
            transition={{ duration: 0.5 }}
          >
            <TypingText text={slogans[index]} />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="max-w-2xl text-balance text-muted-foreground md:text-lg">
        Launch faster with an extensible chat + artifacts foundation: code,
        text, images, sheets. Experiment with agents, models, collaboration &
        more.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a
          className="rounded-md bg-foreground px-6 py-3 font-medium text-background shadow hover:opacity-90"
          href="#newsletter"
        >
          Get Product Updates
        </a>
        <a
          className="rounded-md border px-6 py-3 font-medium hover:bg-accent"
          href="/login"
        >
          Sign In
        </a>
      </div>
    </section>
  );
}

function TypingText({ text }: { text: string }) {
  const [display, setDisplay] = React.useState("");
  React.useEffect(() => {
    setDisplay("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplay(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
      }
    }, 35);
    return () => clearInterval(id);
  }, [text]);
  return (
    <span className="whitespace-pre">
      {display}
      <span
        className="ml-1 inline-block w-2 animate-pulse bg-current"
        style={{ height: "1em" }}
      />
    </span>
  );
}
