declare module 'word-extractor' {
  type ExtractedDocument = {
    getBody(): string;
    getHeaders(options?: { includeFooters?: boolean }): string;
    getFooters(): string;
    getFootnotes(): string;
    getEndnotes(): string;
    getTextboxes(options?: { includeHeadersAndFooters?: boolean }): string;
  };
  export default class WordExtractor { extract(buffer: Buffer): Promise<ExtractedDocument>; }
}
