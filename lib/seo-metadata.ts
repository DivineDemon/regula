import type { Metadata } from "next";

/** Auth, onboarding, and app surfaces that must not compete in search indexes. */
export const nonPublicRobots: Metadata["robots"] = {
  index: false,
  follow: false,
};

export function transactionalMetadata(
  title: string,
  options?: { description?: string },
): Metadata {
  const { description } = options ?? {};
  return {
    title,
    description,
    robots: nonPublicRobots,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

export function publicLegalMetadata(
  canonicalPath: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalPath,
    },
    twitter: {
      title,
      description,
    },
  };
}
