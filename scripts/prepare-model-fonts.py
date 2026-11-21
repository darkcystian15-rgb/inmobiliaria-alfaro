"""Prepare OFL fonts for jsPDF's subsetter (requires fonttools).
The original Carlito files remain unchanged. Modified fonts use a new family
name because Carlito is a Reserved Font Name under the SIL OFL.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

for weight in ('Regular', 'Bold'):
    original = Path('assets/pdf-fonts') / f'Carlito-{weight}.ttf'
    font = TTFont(original)
    glyphs = font.getGlyphSet()
    replacements = {}
    for name in font.getGlyphOrder():
        if font['glyf'][name].isComposite():
            recording = DecomposingRecordingPen(glyphs)
            glyphs[name].draw(recording)
            pen = TTGlyphPen(None)
            recording.replay(pen)
            replacements[name] = pen.glyph()
    for name, glyph in replacements.items():
        font['glyf'][name] = glyph
    font['glyf'].removeHinting()
    for record in font['name'].names:
        if record.nameID in (1, 3, 4, 6, 16, 17):
            text = record.toUnicode().replace('Carlito', 'ModeloSans')
            record.string = text.encode(record.getEncoding())
    destination = original.with_name(f'ModeloSans-{weight}.ttf')
    font.save(destination)
    print(destination, len(replacements), 'composite glyphs flattened')
