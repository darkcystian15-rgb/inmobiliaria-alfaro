export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;
export const MAX_LITERAL_BYTES = MAX_DOCUMENT_BYTES;
export function documentByteLimit(type = '') {
  void type;
  return MAX_DOCUMENT_BYTES;
}
