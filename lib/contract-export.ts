export async function downloadContract(text: string, title: string, format: 'word' | 'pdf') {
  const filename = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  const content = `BORRADOR PARA REVISIÓN\n${title}\n\n${text}`;
  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf'); const pdf = new jsPDF();
    pdf.setFontSize(11);
    const lines: string[] = pdf.splitTextToSize(content, 174); let y = 20;
    for (const line of lines) { if (y > 278) { pdf.addPage(); y = 20; } pdf.text(line, 18, y); y += 5.5; }
    pdf.save(`${filename}.pdf`); return;
  }
  const escaped = content.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const blob = new Blob(['\ufeff', `<html><head><meta charset="utf-8"></head><body><pre style="font-family:Calibri,Arial;font-size:11pt;white-space:pre-wrap">${escaped}</pre></body></html>`], { type: 'application/msword' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${filename}.doc`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
