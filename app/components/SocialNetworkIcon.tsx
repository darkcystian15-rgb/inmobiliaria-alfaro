import { socialNetwork } from '@/lib/publication-review.mjs';

export default function SocialNetworkIcon({ channel }: { channel: string }) {
  const network = socialNetwork(channel);
  if (network === 'Facebook') return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-blue-700" fill="currentColor"><rect width="24" height="24" rx="5"/><path fill="white" d="M14 21v-8h2.7l.4-3H14V8.2c0-.9.3-1.5 1.6-1.5h1.7V4.1A22 22 0 0 0 14.8 4C12.3 4 11 5.5 11 8.1V10H8v3h3v8z"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${network === 'Instagram' ? 'text-pink-700' : 'text-slate-600'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{network === 'Instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></> : <><path d="m10 13 4-4M8 15l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 2 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/></>}</svg>;
}
