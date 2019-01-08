#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python
import json
import requests
import cgi
from utils import WorkflowUtils as utils


print("Content-type: application/json")
print()

params = cgi.FieldStorage()
url = params.getvalue('url')
endpoint = params.getvalue("name")

#url = "http://geoprocessing.demo.52north.org:8080/latest-wps/WebProcessingService?version=1.0.0&"
#endpoint = "ILWIS"
url = "http://130.89.221.193:85/geoserver/ows?"
processes = []
if endpoint == "ILWIS":
    #processes = utils.getIlwisProcesses(url)
    #processes = utils.getIlwisWpsProcesses(url)
    processes = json.loads(requests.get(url).text)
else:
    if "52north.org" in url:
        processes = utils.getoldWpsProcesses(url)
    else:
        processes = utils.getWpsProcesses(url)

print('{"success":"true", "operations":', json.dumps(processes), '}')



