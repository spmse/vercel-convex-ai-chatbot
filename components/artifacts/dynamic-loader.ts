// Dynamic artifact loader to defer large editor bundles until needed.
// Provides caching and a consistent interface.

import type { Artifact } from "@/components/create-artifact";

// We parameterize Artifact with broad any metadata to keep loader generic.
export type AnyArtifact = Artifact<any, any>;
export type DynamicArtifactModule = {
  textArtifact?: AnyArtifact;
  codeArtifact?: AnyArtifact;
  imageArtifact?: AnyArtifact;
  sheetArtifact?: AnyArtifact;
};

const artifactModuleLoaders: Record<
  string,
  () => Promise<DynamicArtifactModule>
> = {
  text: () => import("@/components/artifacts/text/client"),
  code: () => import("@/components/artifacts/code/client"),
  image: () => import("@/components/artifacts/image/client"),
  sheet: () => import("@/components/artifacts/sheet/client"),
};

const artifactCache = new Map<string, AnyArtifact>();
const artifactPromises = new Map<string, Promise<AnyArtifact>>();

export async function loadArtifact(kind: string): Promise<AnyArtifact> {
  if (artifactCache.has(kind)) {
    const cached = artifactCache.get(kind);
    if (!cached) {
      throw new Error(`Cached artifact missing for kind: ${kind}`);
    }
    return cached;
  }

  if (artifactPromises.has(kind)) {
    const pending = artifactPromises.get(kind);
    if (!pending) {
      throw new Error(`Pending promise missing for kind: ${kind}`);
    }
    return pending;
  }

  const promise = (async () => {
    const loader = artifactModuleLoaders[kind];
    if (!loader) {
      throw new Error(`No dynamic loader defined for artifact kind: ${kind}`);
    }
    const mod = await loader();
    const exportName = `${kind}Artifact` as keyof DynamicArtifactModule;
    const artifact = mod[exportName];
    if (!artifact) {
      throw new Error(`Dynamic module did not export ${exportName}`);
    }
    artifactCache.set(kind, artifact);
    return artifact;
  })();

  artifactPromises.set(kind, promise);
  const resolved = await promise;
  artifactPromises.delete(kind);
  return resolved;
}

export function hasArtifactLoaded(kind: string): boolean {
  return artifactCache.has(kind);
}
