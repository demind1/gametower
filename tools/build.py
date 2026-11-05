"""Produce a standalone offline HTML and a source ZIP using only the Python stdlib."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root/'dist';out.mkdir(exist_ok=True)
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="css/styles.css">','<style>\n'+(root/'css/styles.css').read_text()+'\n</style>')
html=html.replace('<script src="js/game.js"></script>','<script>\n'+(root/'js/game.js').read_text()+'\n</script>')
(out/'NEON_OUTBREAK_4_OFFLINE.html').write_text(html)
with zipfile.ZipFile(out/'NEON_OUTBREAK_4_SOURCE.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in ['index.html','css/styles.css','js/game.js','README.md','GRAPHICS_OVERHAUL.md','standalone-original.html','tools/build.py','tests/browser.cjs','dist/NEON_OUTBREAK_4_OFFLINE.html']:
  if (root/f).exists():z.write(root/f,'NEON_OUTBREAK_4/'+f)
 for f in (root/'artifacts').glob('*'):
  if f.is_file():z.write(f,'NEON_OUTBREAK_4/artifacts/'+f.name)
print(out/'NEON_OUTBREAK_4_SOURCE.zip')
