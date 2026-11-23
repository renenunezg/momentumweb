import { redirect } from "next/navigation";
import { SPORT_HOME } from "@/lib/site";

export default function LmbPage() {
  redirect(SPORT_HOME.lmb);
}
