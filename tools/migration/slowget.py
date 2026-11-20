import time, urllib.request, ssl, os
_last=[0]
def get(url, binary=False, delay=0.7):
    w=delay-(time.time()-_last[0])
    if w>0: time.sleep(w)
    _last[0]=time.time()
    req=urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'})
    try:
        r=urllib.request.urlopen(req, timeout=60)
        d=r.read(); return r.status, dict(r.headers), (d if binary else d.decode('utf-8','replace'))
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), (b'' if binary else '')
    except Exception as e:
        return 0, {}, (b'' if binary else '')
