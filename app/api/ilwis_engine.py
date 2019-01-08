#!C:/Users/Bob/AppData/Local/Programs/Python/Python35-32/python
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
import ilwis, os
from utils import Util as utils
import time
import simplejson

working_url = "file:///C:/ms4w/Apache/htdocs/WorkflowApp/app/api/files/"
ilwis.Engine.setWorkingCatalog(working_url)
class testHTTPServer_RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        self.do_OPTIONS()
        self.data_string = self.rfile.read(int(self.headers['Content-Length']))
        ilwis.Engine.setWorkingCatalog(working_url)
        data = simplejson.loads(self.data_string)
        files = data['files']
        file1 = ilwis.RasterCoverage(files[0])
        file2 = ilwis.RasterCoverage(files[1])
        raster = ilwis.Engine.do(data['operation'],"'"+data['texts']+"'", file1, file2)
        cwd = os.getcwd()
        file = "files/" + utils.id_generator() + str(int(time.time()))
        outputPath = cwd +"/"+ file
        raster.store("file:///"+(outputPath.replace("\\", "/"))+".mpr")
        ras = ilwis.RasterCoverage("file:///"+(outputPath.replace("\\", "/"))+".mpr")
        ilwis.Engine.do('saveas', ras, "'file:///"+(outputPath.replace("\\", "/"))+".tif'", 'GTiff', 'gdal')
        self.end_headers()
        self.wfile.write(bytes(json.dumps({"path": file+".tif"}), "utf8"))
        del data
        del raster
        del ras
        del file1
        del file2


    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def run():
    print('starting server...')
    # Server settings
    # Choose port 8080, for port 80, which is normally used for a http server, you need root access
    server_address = ('127.0.0.1', 2525)
    httpd = HTTPServer(server_address, testHTTPServer_RequestHandler)
    print('running ILWIS server...Port: 2525')
    httpd.serve_forever()
run()