export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_LITERAL_BYTES = 50 * 1024 * 1024;
export const documentByteLimit = type => ['COPIA_LITERAL_CRI', 'COPIA_LITERAL'].includes(type) ? MAX_LITERAL_BYTES : MAX_DOCUMENT_BYTES;
