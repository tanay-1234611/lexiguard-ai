import { cookies } from "next/headers";

const UUID = /^[a-f0-9-]{36}$/;

/**
 * Contracts are tied to an anonymous, httpOnly cookie so one visitor cannot list or
 * open another visitor's documents. This is a demo-grade safeguard, not real authentication.
 */
export function getOrCreateSessionId(): string {
  const jar = cookies();
  let id = jar.get("lg_sid")?.value;
  if (!id || !UUID.test(id)) {
    id = crypto.randomUUID();
    jar.set("lg_sid", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return id;
}
