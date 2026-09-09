# Manual refresh only; normal builds remain offline. Review changed source checksums and licenses before rebuilding.
import urllib.request,re,json,hashlib
from pathlib import Path
out=Path('assets/starter-books')
html=urllib.request.urlopen('https://www.gutenberg.org/browse/languages/zh',timeout=30).read().decode()
m=re.search(r'href="/ebooks/(\d+)"[^>]*>世說新語</a>',html)
print('shishuo',m.group(1) if m else 'notfound')
books=[('7337','道德经'),('52323','唐诗三百首'),('2680','Meditations'),('43','Jekyll and Hyde'),('11','Alice in Wonderland')]
if m:books.append((m.group(1),'世说新语'))
manifest=[]
for ident,title in books:
 url='https://www.gutenberg.org/ebooks/'+ident
 page=urllib.request.urlopen(url,timeout=30).read().decode()
 links=re.findall(r'href="([^"]+)"',page)
 href=next(x for x in links if '.txt.utf-8' in x)
 dl=urllib.parse.urljoin(url,href)
 data=urllib.request.urlopen(dl,timeout=45).read()
 assert b'PROJECT GUTENBERG' in data.upper()
 (out/(ident+'.txt')).write_bytes(data)
 manifest.append(dict(id=ident,title=title,source=url,download=dl,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
 print(title,len(data),dl)
(out/'catalog.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
