import { CheckIcon, ClockIcon } from "@radix-ui/react-icons";

type Item = {
  title: string;
  status: "done" | "planned" | "in-progress";
  description: string;
};

const items: Item[] = [
  {
    title: "Social Logins",
    status: "in-progress",
    description: "Google, GitHub and more for frictionless onboarding.",
  },
  {
    title: "Workspaces",
    status: "done",
    description: "Group chats, documents & artifacts per team or project.",
  },
  {
    title: "MCP Support",
    status: "planned",
    description:
      "Integrate Model Context Protocol for external tool orchestration.",
  },
  {
    title: "Collaborative Threads",
    status: "planned",
    description: "Real-time multi-user chat editing & artifact co-creation.",
  },
  {
    title: "SSO & Organizations",
    status: "planned",
    description: "Enterprise SSO, org management and roles.",
  },
  {
    title: "Model Customization",
    status: "planned",
    description: "Fine-tune or adapter-based personalization flows.",
  },
  {
    title: "Agent Customization",
    status: "planned",
    description: "Configure tools, memory, goals & autonomy per agent.",
  },
  {
    title: "Agent Configurability UI",
    status: "planned",
    description: "Inline editing & versioned agent profiles.",
  },
];

export function Roadmap() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24">
      <h2 className="text-center font-semibold text-3xl">Roadmap</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground text-sm">
        We ship iteratively. Here's a glimpse of what we're building next.
      </p>
      <ol className="mt-10 grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <li
            className="group rounded-xl border bg-card/60 p-5 backdrop-blur transition-colors hover:bg-card"
            key={item.title}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                  {item.description}
                </p>
              </div>
              <StatusPill status={item.status} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatusPill({ status }: { status: Item["status"] }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border";
  if (status === "done") {
    return (
      <span
        className={`${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`}
      >
        <CheckIcon className="h-3 w-3" /> Done
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span
        className={`${base} border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300`}
      >
        <ClockIcon className="h-3 w-3 animate-pulse" /> In Progress
      </span>
    );
  }
  return (
    <span
      className={`${base} border-muted-foreground/30 bg-muted text-muted-foreground`}
    >
      Planned
    </span>
  );
}
