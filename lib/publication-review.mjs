import { unconfirmedCount } from './publication-text-model.mjs';

// Additive quality flag: publication confirmations and historical stages stay intact.
export function textNeedsReview(publication) {
  return Boolean((publication?.textoRealizado || publication?.publicado) && unconfirmedCount(publication?.texto || '') > 0);
}
export function socialNetwork(channel = '') {
  const value = channel.trim().toLowerCase();
  if (['facebook', 'fb'].includes(value)) return 'Facebook';
  if (['instagram', 'ig'].includes(value)) return 'Instagram';
  return 'Otra red';
}
