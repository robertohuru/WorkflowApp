import requests

url = 'http://130.89.221.193:85/geoserver/ows?'
payload = """
<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
            <ows:Identifier>gs:Centroid</ows:Identifier>
            <wps:DataInputs>
              <wps:Input>
                <ows:Identifier>features</ows:Identifier>
                <wps:Reference mimeType="application/json" xlink:href="http://130.89.8.26:85/geoserver/maris_mamase/ows?service=WFS&request=GetFeature&typeName=maris_mamase:DMprod_kg_cons&outputFormat=application/json" method="GET"/>
              </wps:Input>
            </wps:DataInputs>
            <wps:ResponseForm>
              <wps:RawDataOutput mimeType="application/json">
                <ows:Identifier>result</ows:Identifier>
              </wps:RawDataOutput>
            </wps:ResponseForm>
</wps:Execute>"""
headers = {'content-type': 'text/xml'}
r = requests.post(url, data=payload, headers=headers)
print(r.text)