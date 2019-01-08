#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python
import json
import cgi
import requests
import re
from utils import Util as utils
print("Content-type: application/json")
print()

params = cgi.FieldStorage()
url = params.getvalue('url')
toSrid = params.getvalue('srid')
if url is None:
    url = "http://130.89.8.26:85/geoserver/maris_mamase/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=maris_mamase:mamase_conservancies&maxFeatures=50&outputFormat=application/json"

if toSrid is None:
    toSrid = 3857
results = requests.post(url)
if results.text == "":
    results = []

data = {
        "data":results.text,
        "fromSRID": 0,
        "toSRID" : 3857
}
header = {"content-tpe": "text/plain"}
result = requests.post("http://130.89.221.193:75/transformcoords", data=json.dumps(data), headers= header)

print(result.text)






