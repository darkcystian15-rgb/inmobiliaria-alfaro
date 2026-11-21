export type WordEditorLine = { text: string; paragraph?: number };

export function editWordLines(lines: WordEditorLine[], value: string): WordEditorLine[] {
  const next = value.split('\n');
  let start = 0;
  while (start < lines.length && start < next.length && lines[start].text === next[start]) start++;
  let end = lines.length;
  let nextEnd = next.length;
  while (end > start && nextEnd > start && lines[end - 1].text === next[nextEnd - 1]) {
    end--;
    nextEnd--;
  }
  const previous = lines.slice(start, end);
  const changed = next.slice(start, nextEnd).map((text, index) => ({
    text,
    paragraph: previous[index]?.paragraph,
  }));
  return [...lines.slice(0, start), ...changed, ...lines.slice(end)];
}
