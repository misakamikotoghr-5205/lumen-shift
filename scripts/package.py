"""Make a reproducible browser ZIP; no source credentials or hosting metadata."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent.parent
files=sorted(p for p in (root/'dist').rglob('*') if p.is_file())
if not (root/'dist/index.html').is_file(): raise SystemExit('Build first')
output=root/'submission/lumen-shift.zip';output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED) as archive:
 for p in files:
  info=zipfile.ZipInfo(str(p.relative_to(root/'dist')),date_time=(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;archive.writestr(info,p.read_bytes())
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None and 'index.html' in archive.namelist()
print(f'{output.name}: {len(files)} files, {output.stat().st_size} bytes, CRC verified')
