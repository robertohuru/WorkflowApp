#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python
import json
import cgi
import requests
import xmltodict

print("Content-type: application/json")
print()

params = cgi.FieldStorage()

# URL of the WCS Server
url = params.getvalue('url')
if url is None:
    url = "http://130.89.8.26:85/geoserver/ows?"

# Result of the GetCapabilities
results = requests.post(url+"version=1.0.0&service=WCS&request=DescribeCoverage")
if results.text == "":
    coverages = []
else:
    jsonResponse = xmltodict.parse(results.text)
    coverages = []
    for row in jsonResponse['wcs:CoverageDescription']['wcs:CoverageOffering']:
        coverage = {}
        coverage['name'] = row['wcs:name']
        coverage['url'] = url + "version=2.0.0&service=WCS&request=GetCoverage&coverageId=" + row['wcs:name'] + "&format=image/geotiff"
        coverage['title'] = row['wcs:label']
        coverage['abstract'] = row['wcs:description']
        coverage['defaultCRS'] = row['wcs:lonLatEnvelope']['@srsName']
        coverage['properties'] = {"min": [float((row['wcs:lonLatEnvelope']['gml:pos'][0]).split(" ")[0]), float((row['wcs:lonLatEnvelope']['gml:pos'][0]).split(" ")[1])], "max": [float((row['wcs:lonLatEnvelope']['gml:pos'][1]).split(" ")[0]), float((row['wcs:lonLatEnvelope']['gml:pos'][1]).split(" ")[1])]}
        coverages.append(coverage)

print('{"success":"true", "coverages":', json.dumps(coverages), '}')