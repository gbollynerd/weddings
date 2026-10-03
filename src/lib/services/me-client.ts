import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { clientBooking } from "./client";

export const currentClient = cache(async () => {
  const user = await requireUser(["client"]);
  const booking = await clientBooking(user.id);
  return { user, booking };
});
