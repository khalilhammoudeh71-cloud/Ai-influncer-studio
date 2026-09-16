"""Loopback-only fixture proxy for Simulator Safari; never part of the app build."""
import json,urllib.request
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from baseline import AUTH,PERSONA
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?')[0]
  if path=='/src/lib/supabase.ts':body=AUTH.encode();kind='application/javascript'
  elif path.startswith('/api/'):
   value=[PERSONA] if path=='/api/personas' else {'credits':100,'subscriptionStatus':'active'} if path=='/api/billing' else []
   body=json.dumps(value).encode();kind='application/json'
  else:
   try:
    with urllib.request.urlopen('http://127.0.0.1:5217'+self.path) as response:body=response.read();kind=response.headers.get('Content-Type','text/plain')
   except Exception:self.send_error(502);return
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',len(body));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
 def do_POST(self):self.send_error(503,'Read-only fixture: no provider or paid actions')
 def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',5218),Handler).serve_forever()
