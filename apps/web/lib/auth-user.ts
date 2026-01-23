import { useSession } from "./auth-client";

export const useCurrentUser = () => {
  const { data: session, isPending } = useSession();

  if (isPending || !session) {
    return undefined;
  }

  return session.user;
};
