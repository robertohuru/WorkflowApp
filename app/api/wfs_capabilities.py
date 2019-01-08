#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python
import json
import cgi
import requests
import xmltodict

print("Content-type: application/json")
print()

params = cgi.FieldStorage()
# URL of the WFS Server
url = params.getvalue('url')
if url is None:
    url = "http://130.89.8.26:85/geoserver/ows?"

# Result of the GetCapabilities
results = requests.post(url+"service=WFS&request=GetCapabilities")

features = []
if results.text == "":
    features = []
else:
    # parse the XML response to a JSON object
    jsonResponse = xmltodict.parse(results.text)
    for row in jsonResponse['wfs:WFS_Capabilities']['FeatureTypeList']['FeatureType']:
        feature = {}
        feature['url'] = url + "service=WFS&request=GetFeature&typeName="+row['Name']+"&outputFormat=application/json"
        feature['name'] = row['Name']
        feature['title'] = row['Title']
        feature['abstract'] = row['Abstract']
        feature['defaultCRS'] = row['DefaultCRS']
        results = requests.post(url + "service=WFS&request=DescribeFeatureType&typeName="+row['Name']+"&outputFormat=application/json")
        results = json.loads(results.text)
        feature['properties'] = results['featureTypes']
        features.append(feature)

print('{"success":"true", "features":', json.dumps(features), '}')