import Link from "next/link";
import { Feedback } from "./InterfaceFeedback";

export type NextRegistrationAction = { href: string; label: string };
export default function RegistrationSuccess({ message, nextAction }: { message: string; nextAction: NextRegistrationAction | null }) {
  return <Feedback tone="success" className="my-5"><p>{message}</p>{nextAction && <Link href={nextAction.href} className="aa-button aa-button-secondary mt-3">{nextAction.label} →</Link>}</Feedback>;
}
