import requests
import json
jsonBody = """
{
    "Execute": {
        "Identifier": "org.n52.wps.server.algorithm.JTSConvexHullAlgorithm",
        "Input": [
            {
            "ComplexData": {
                    "_mimeType": "application/wkt",
                    "_text": "POLYGON((847666.55940505 6793166.084248,849319.51014149 6793452.723104,848402.26580219 6792640.5796786,849873.67859648 6792439.9324794,847666.55940505 6793166.084248))"
            },
            "_id": "data"
            }
        ],
        "output":[{
            "_mimeType": "application/vnd.geo+json",
            "_id": "result",
            "_transmission": "value"
        }],
        "_service": "WPS",
        "_version": "2.0.0"
    }
}
"""
headers = {'content-type': 'application/json'}
url = "http://geoprocessing.demo.52north.org:8080/wps-proxy/processes/org.n52.wps.server.algorithm.JTSConvexHullAlgorithm/jobs"
r = requests.post(url, data= jsonBody, headers=headers)
print(r)
print(r.headers)

url = r.headers["Location"]
r = requests.get(url)
print(r)
print(r.text)