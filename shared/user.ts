// The user as the client sees it. Never the password hash.
export type Sex = "female" | "male";

export type PublicUser = {
  id: number;
  username: string;
  email: string;
  sex: Sex | null;
};
