import Google, { type GoogleProfile } from "@auth/core/providers/google";

export type GoogleClaims = Pick<GoogleProfile, "sub" | "email" | "email_verified" | "name" | "picture">;

export function profileFromGoogle(claims: GoogleClaims) {
  return { id: claims.sub, name: claims.name, email: claims.email, image: claims.picture, emailVerified: claims.email_verified };
}

export const google = Google({ profile: profileFromGoogle });
