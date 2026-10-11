import { ContextLink as Link, ReturnLink } from "./NavigationReturn";
import { Feedback } from "./InterfaceFeedback";

export type NextRegistrationAction = { href: string; label: string };
export default function RegistrationSuccess({ message, nextAction }: { message: string; nextAction: NextRegistrationAction | null }) {
  return <Feedback tone="success" className="my-5"><p>{message}</p><div className="mt-3 flex flex-wrap gap-3">{nextAction && <Link href={nextAction.href} className="aa-button aa-button-secondary">{nextAction.label} →</Link>}<ReturnLink /></div></Feedback>;
}
