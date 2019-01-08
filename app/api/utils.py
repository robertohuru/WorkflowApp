#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python
from _ast import slice
from itertools import count
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import string
import random
from xml.etree import ElementTree
from xml.dom import minidom
from xml.etree.ElementTree import Element, SubElement
from xml.etree.ElementTree import XML, fromstring, tostring
from osgeo import ogr
from osgeo import osr
import os, json, csv
import gdal
import numpy as np
from osgeo import gdal_array as gdarr
import time
from urllib.request import quote
import xmltodict
from dicttoxml import dicttoxml
import math
import socket
import re

addr = socket.gethostbyname(socket.gethostname())

class Util:
    def id_generator(size=6, chars=string.ascii_uppercase + string.digits):
        file = ''.join(random.choice(chars) for _ in range(size))
        return "BOB"+file
    def toCsv(data):
        file = open('output/Livestock_Information.csv', 'w')
        csvwriter = csv.writer(file)
        count = 0
        for row in data:
            if count == 0:
                header = row.keys()
                csvwriter.writerow(header)
                count += 1
            csvwriter.writerow(row.values())
        return 'output/Livestock_Information.csv'
    def saveFeature(srsID, geometry, outputfile):
        extension = os.path.splitext(outputfile)[1]
        if extension == ".shp":
            driver = ogr.GetDriverByName("ESRI Shapefile")
        elif extension == ".kml":
            driver = ogr.GetDriverByName("KML")

        data_source = driver.CreateDataSource(outputfile)
        srs = osr.SpatialReference()
        srs.ImportFromEPSG(srsID)
        gtype =  ogr.wkbPolygon
        if geometry.GetGeometryName() == "POLYGON":
            gtype = ogr.wkbPolygon
        elif geometry.GetGeometryName() == "POINT":
            gtype = ogr.wkbPoint
        elif geometry.GetGeometryName() == "MULTIPOINT":
            gtype = ogr.wkbMultiPoint
        layer = data_source.CreateLayer(os.path.splitext(outputfile)[0], srs,gtype)
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetGeometry(geometry)
        layer.CreateFeature(feature)
    def coordinateTransform(coord, fromSRID=4326, toSRID=32736):
        source = osr.SpatialReference()
        source.ImportFromEPSG(fromSRID)
        target = osr.SpatialReference()
        target.ImportFromEPSG(toSRID)
        transform = osr.CoordinateTransformation(source, target)
        point = ogr.CreateGeometryFromWkt("POINT (%s %s)"%(coord[0],coord[1]))
        point.Transform(transform)
        transCoord = json.loads(point.ExportToJson())
        return transCoord["coordinates"]
    def coordinateTransformJeoJson(jeoJson, fromSRID=21036, toSRID=4326):
        source = osr.SpatialReference()
        source.ImportFromEPSG(fromSRID)
        target = osr.SpatialReference()
        target.ImportFromEPSG(toSRID)
        transform = osr.CoordinateTransformation(source, target)
        point = ogr.CreateGeometryFromJson(jeoJson)
        point.Transform(transform)
        transCoord = json.loads(point.ExportToJson())
        return transCoord["coordinates"]
    def coordinateTransformGeoJSON(geoJSON, fromSRID, toSRID):
        if int(fromSRID) is 0 or fromSRID is None:
            fromSRID = re.findall(r'\b\d+\b', json.loads(geoJSON)['crs']['properties']['name'])[0]
        pg = psycopg2.connect("dbname='maris_db' user='postgres' host='130.89.8.26' password='maRis2018$DB'")
        cursor = pg.cursor(cursor_factory=RealDictCursor)
        query = "WITH data AS (SELECT '%s'::json AS fc)" \
                "SELECT 'Feature' as type, " \
                "feat->'id' AS id, " \
                "feat->'geometry_name' AS geometry_name, " \
                "st_asgeojson(st_transform(St_setSRID(ST_GeomFromGeoJSON(feat->>'geometry'),%d),%d)) AS geometry, " \
                "feat->'properties' AS properties " \
                "FROM ( SELECT json_array_elements(fc->'features') AS feat FROM data) AS f" % (
                geoJSON, int(fromSRID), int(toSRID))

        cursor.execute(query)
        results = cursor.fetchall()
        result = '{"type":"FeatureCollection", "features":' + str(results) + ', "totalFeatures": ' + str(
            len(results)) + ', "crs": ' + json.dumps(
            {'type': 'name', 'properties': {'name': 'EPSG::' + str(toSRID)}}) + '}'

        result = result.replace("'{", "{").replace("}'", "}")
        cursor.close()
        pg.close()
        return result.replace("'", '"')
    def getDataFromSelectedRegion(file, coords4326):
        nodatavalue = 0  # nodata value for the output raster
        coords = "POLYGON(("
        for coord in coords4326:
            transcoord = Util.coordinateTransform(coord.split(' '), 4326, 32736)
            coords = coords + str(transcoord[0]) + ' ' + str(transcoord[1]) + ','
        coords = coords[:-1] + '))'

        geometry = ogr.CreateGeometryFromWkt(coords)
        Util.saveFeature(32736, geometry, "output/output.shp")
        dataset = gdal.Open(file)
        driver = gdal.GetDriverByName('MEM')  # memory raster
        # get raster size
        x = dataset.RasterXSize
        y = dataset.RasterYSize

        # define the new output raster (I want an integer raster with 1 bands)
        outRaster = driver.Create('transline', x, y, 1, gdal.GDT_Int16)
        # set projection and geotrasform
        outRaster.SetProjection(dataset.GetProjection())
        outRaster.SetGeoTransform(dataset.GetGeoTransform())

        # Get mask band and set the nodata value
        maskBand = outRaster.GetRasterBand(1)
        maskBand.SetNoDataValue(nodatavalue)

        source_ds = ogr.Open("output/output.shp")
        layer = source_ds.GetLayer()
        gdal.RasterizeLayer(outRaster, [1], layer, burn_values=[1])

        # export to numpy
        pxArray = gdarr.DatasetReadAsArray(dataset, 0, 0, x, y)
        transPx = gdarr.DatasetReadAsArray(outRaster, 0, 0, x, y)

        crossPixels = np.multiply(pxArray, transPx)
        # Extract pixel values which are greater than 0
        result = np.extract(crossPixels > 0, crossPixels)
        return np.sum(result)
    def getPixelValues(file):
        dataset = gdal.Open(file)
        x = dataset.RasterXSize
        y = dataset.RasterYSize
        pxArray = gdarr.DatasetReadAsArray(dataset, 0, 0, x, y)
        return pxArray
    def binaryMathRaster(url1, url2, operation):
        res1 = Util.getPixelsFromUrl(url1)
        res2 = Util.getPixelsFromUrl(url2)
        pix1 = res1["pixArr"]
        pix2 = res2["pixArr"]
        result = []
        operation = operation.lower()
        if operation == "add" or operation == 'sum' or operation == 'addition' or operation == 'plus':
            result = np.add(pix1, pix2)
        elif operation == "substract" or operation == 'subtract' or operation == 'minus' or operation == 'subtraction':
            result = np.subtract(pix1, pix2)
        elif operation == "multiply" or operation == 'product' or operation == 'times' or operation =='multiplication':
            result = np.multiply(pix1, pix2)
        elif operation == "divide" or operation == 'quotient' or operation == 'division':
            np.seterr(divide='ignore', invalid='ignore')
            result = np.true_divide(pix1, pix2)
        file1 = res1["file"]
        outputFile = "files/" + Util.id_generator() + str(int(time.time())) + ".tif"
        Util.numpArraytoGeoTiff(file1, result, outputFile)
        if os.path.exists(outputFile):
            return outputFile
        else:
            return None
    def downloadRasterFile(url):
        r = requests.get(url)
        cwd = os.getcwd()
        path = cwd + "\\files\\" + Util.id_generator() + str(int(time.time())) + ".tif"
        file = open(path, 'wb')
        file.write(r.content)
        file.close()
        return {"file": path}
    def generateSLD(file, sldName):
        pixArr = Util.getPixelValues(file)
        root = Element('StyledLayerDescriptor')
        root.set('version', '1.0.0')
        root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        root.set('xmlns', 'http://www.opengis.net/sld')
        root.set('xmlns:ogc', 'http://www.opengis.net/ogc')
        root.set('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        root.set('xsi:schemaLocation', 'http://www.opengis.net/sld StyledLayerDescriptor.xsd')
        namedLayer = SubElement(root, 'NamedLayer')
        name = SubElement(namedLayer, 'Name')
        name.text = "raster_style"
        userStyle = SubElement(namedLayer, 'UserStyle')
        title = SubElement(userStyle, 'Title')
        title.text = "raster_style"
        abstract = SubElement(userStyle, "Abstract")
        abstract.text = "Automatically generated raster styles"
        featureTypeStyle = SubElement(userStyle, 'FeatureTypeStyle')
        rule = SubElement(featureTypeStyle, "Rule")
        name = SubElement(rule, "Name")
        name.text = "Rule1"
        title = SubElement(rule, "Title")
        title.text = "Raster_style"
        abstract = SubElement(rule, "Abstract")
        abstract.text = "Raster with different classes"
        rasterSymbolizer = SubElement(rule, "RasterSymbolizer")
        opacity = SubElement(rasterSymbolizer, "Opacity")
        opacity.text = "1"
        colorMap = SubElement(rasterSymbolizer, "ColorMap")
        colorMap.set("type", "intervals")
        pixArr = pixArr[0]
        pixArr = set(pixArr)
        pixArr = list(pixArr)
        pixArr.sort()
        min = np.min(pixArr)

        max = np.max(pixArr)
        n = int(len(pixArr) / 7)

        colors = ["#8c510a", "#d8b365", "#f6e8c3", "#f5f5f5", "#c7eae5", "#5ab4ac", "#01665e"]

        j = 0
        for i in range(0, len(pixArr)-1, n):
            colorMapEntry = SubElement(colorMap, "ColorMapEntry")
            colorMapEntry.set("color", colors[j])
            colorMapEntry.set("quantity", str(pixArr[i]))
            colorMapEntry.set("label", str(pixArr[i]))
            if j == 0:
                colorMapEntry.set("opacity", "0")
            else:
                colorMapEntry.set("opacity", "1")
            j = j + 1

        colorMapEntry = SubElement(colorMap, "ColorMapEntry")
        colorMapEntry.set("color", "#003300")
        colorMapEntry.set("quantity", str(max))
        colorMapEntry.set("label", str(max))
        colorMapEntry.set("opacity", "1")
        xml = WorkflowUtils.prettify(root)
        sldFile = open("files/"+sldName+".xml", "w")
        sldFile.write(xml)
        sldFile.close()
        return "files/"+sldName+".xml"
    def getExtent(file):
        src = gdal.Open(file)
        ulx, xres, xskew, uly, yskew, yres = src.GetGeoTransform()
        lrx = ulx + (src.RasterXSize * xres)
        lry = uly + (src.RasterYSize * yres)
        proj = Util.getProjection(file)
        if proj is None:
            proj = 32736
        else:
            proj = int(proj)
        return {"southwest": Util.coordinateTransform([lrx, uly], proj, 4326), "northeast": Util.coordinateTransform([ulx, lry], proj, 4326)}
    def getProjection(file):
        dataset = gdal.Open(file)
        proj = osr.SpatialReference(wkt=dataset.GetProjection())
        return proj.GetAttrValue('AUTHORITY', 1)
    def getPixelsFromUrl(url):
        r = requests.get(url)
        cwd = os.getcwd()
        path = cwd + "\\files\\" + Util.id_generator() + str(int(time.time())) + ".tif"
        file = open(path, 'wb')
        file.write(r.content)
        result = Util.getPixelValues(path)
        file.close()
        return {"file": path, "pixArr": result}
    def numpArraytoGeoTiff(inputFile, array, outputfile):
        driver = gdal.GetDriverByName('GTiff')
        dataset = gdal.Open(inputFile)

        band = dataset.GetRasterBand(1)
        # get raster size
        x = dataset.RasterXSize
        y = dataset.RasterYSize
        # define the new output raster (I want an integer raster with 1 bands)
        outRaster = driver.Create(outputfile, x, y, 1, gdal.GDT_Int16)
        # set projection and geotrasform
        outRaster.SetProjection(dataset.GetProjection())
        outRaster.SetGeoTransform(dataset.GetGeoTransform())
        # Get mask band and set the nodata value
        maskBand = outRaster.GetRasterBand(1)
        maskBand.WriteArray(array)
        nodatavalue = band.GetNoDataValue()  # nodata value for the output raster
        maskBand.SetNoDataValue(nodatavalue)
        maskBand.FlushCache()  # flush the cache and clean memory
        maskBand = None
        band.FlushCache()
        band = None
class WorkflowUtils:
    def prettify(elem):
        """Return a pretty-printed XML string for the Element.
        """
        rough_string = ElementTree.tostring(elem, encoding='utf-8')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")

    def wpsHead(self):
        root = Element('wps:Execute')
        root.set('service', 'WPS')
        root.set('version', '1.0')
        root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        root.set('xmlns', 'http://www.opengis.net/wps/1.0.0')
        root.set('xmlns:wfs', 'http://www.opengis.net/wfs')
        root.set('xmlns:wps', 'http://www.opengis.net/wps/1.0.0')
        root.set('xmlns:ows', 'http://www.opengis.net/ows/1.1')
        root.set('xmlns:gml', 'http://www.opengis.net/gml')
        root.set('xmlns:ogc', 'http://www.opengis.net/ogc')
        root.set('xmlns:wcs', 'http://www.opengis.net/wcs/1.1.1')
        root.set('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        root.set('xsi:schemaLocation', 'http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd')
        return root

    def transformTowps(operation, type='application/json'):
        root = WorkflowUtils.wpsHead(WorkflowUtils)
        label = operation['metadata']['label']
        ows_Identifier = SubElement(root, 'ows:Identifier')
        ows_Identifier.text = label
        wps_DataInputs = SubElement(root, 'wps:DataInputs')
        for input in operation['inputs']:
            if len(input['value']) > 0:
                if input['type'] == 'geom':
                    wps_Input = SubElement(wps_DataInputs, 'wps:Input')
                    ows_Identifier = SubElement(wps_Input, 'ows:Identifier')
                    ows_Identifier.text = input['identifier']
                    if input['url'] == "":
                        wps_Data = SubElement(wps_Input, 'wps:Data')
                        wps_ComplexData = SubElement(wps_Data, 'wps:ComplexData')
                        wps_ComplexData.set('mimeType', 'application/json')
                        wps_ComplexData.text = input['value']
                    else:
                        wps_Reference = SubElement(wps_Input, 'wps:Reference')
                        wps_Reference.set('mimeType', 'application/json')
                        wps_Reference.set('xlink:href', input['value'])
                        wps_Reference.set('method', 'GET')

                elif input['type'] == 'coverage':
                    wps_Input = SubElement(wps_DataInputs, 'wps:Input')
                    ows_Identifier = SubElement(wps_Input, 'ows:Identifier')
                    ows_Identifier.text = input['identifier']
                    wps_Data = SubElement(wps_Input, 'wps:Data')
                    wps_ComplexData = SubElement(wps_Data, 'wps:ComplexData')
                    wps_ComplexData.set('mimeType', 'application/json')
                    wps_ComplexData.text = input['value']
                else:
                    wps_Input = SubElement(wps_DataInputs, 'wps:Input')
                    ows_Identifier = SubElement(wps_Input, 'ows:Identifier')
                    ows_Identifier.text = input['identifier']
                    wps_Data = SubElement(wps_Input, 'wps:Data')
                    wps_LiteralData = SubElement(wps_Data, 'wps:LiteralData')
                    wps_LiteralData.text = input['value']
        wps_ResponseForm = SubElement(root, 'wps:ResponseForm')
        wps_RawDataOutput = SubElement(wps_ResponseForm, 'wps:RawDataOutput')
        wps_RawDataOutput.set('mimeType', type)
        ows_Identifier = SubElement(wps_RawDataOutput, 'ows:Identifier')
        ows_Identifier.text = 'result'

        return root

    def executeWPS(operation, type='application/json'):
        wps = WorkflowUtils.transformTowps(operation, type)
        url = operation['metadata']['url']
        headers = {'content-type': 'text/xml'}
        r = requests.post(url, data= WorkflowUtils.prettify(wps), headers=headers)
        return r.text
    def executeILWIS(operation):
        label = operation['metadata']['label']
        maps = []
        texts = []
        for input in operation['inputs']:
            if input['type'] == 'geom' or input['type'] == 'coverage':
                maps.append(quote(input['value']))
            else:
                texts.append(input['value'])
        maps = ";".join(maps)
        texts = "/".join(texts)
        inputs = maps +";"+ texts
        results = requests.get(operation["metadata"]["url"] + "/execute/" + inputs + "/"+label)
        if results.text == "":
            results = []
        else:
            results = results.text
        return results
    def publishRaster(operation):
        file = Util.downloadRasterFile(operation["inputs"][0]["value"])
        file = file["file"]
        projection = ""
        if Util.getProjection(file) is None or Util.getProjection(file) == "":
            projection = "EPSG:" + str(32736)
        else:
            projection = "EPSG:" + str(Util.getProjection(file))

        #projection = "EPSG:" + str(Util.getProjection(file))
        geoserver = quote(operation["inputs"][1]["value"])
        workspace = operation["inputs"][2]["value"]
        username = operation["inputs"][3]["value"]
        password = operation["inputs"][4]["value"]
        urls = file+";"+geoserver
        texts = workspace+";"+projection+";"+username+";"+password
        results = requests.get(operation["metadata"]["url"] + "/" + urls + "/" + texts)
        if results.text == "":
            results = []
        else:
            results = results.text

        return results
    def generateRESTfulURL(operation):
        """Create a URL for the RESTful service"""
        inputs = ""
        for input in operation['inputs']:
            inputs = inputs + "/" + quote(input["value"])
        url = operation["metadata"]["url"] + "" + inputs + ""
        return url

    def executeREST(operation):
        """Create a URL for the RESTful service which is then submitted
        using HTTP Get request"""
        url = WorkflowUtils.generateRESTfulURL(operation)
        results = requests.get(url)
        if results.text == "":
            results = []
        else:
            results = json.loads(results.text)
        return results

    def recursiveF(connections, orderID, id):
        for connection in connections:
            if connection["toOperationID"] == id:
                if connection["fromOperationID"] in orderID:
                    orderID.remove(connection["fromOperationID"])
                orderID.insert(0, connection["fromOperationID"])
                WorkflowUtils.recursiveF(connections, orderID, connection["fromOperationID"])
        return orderID

    def getOperationByID(id, operations):
        oper = []
        for operation in operations:
            if str(operation["id"]) == str(id):
                oper = operation
                break
        return oper
    def getOperationIndex(id, operations):
        j = None
        for i in range(0, len(operations)):
            if operations[i]["id"] == id:
                j = i
                break
        return j

    def getExecutionOrder(workflow):
        operations = workflow["operations"]
        connections = workflow["connections"]
        # NodeIDs represent the ID of the parent operation
        nodeIDs = set()
        # OperIDs represent the ID of all the operations
        operIDs = set()
        for operation in operations:
            operIDs.add(operation["id"])
            for connection in connections:
                if connection["fromOperationID"] == operation["id"]:
                    nodeIDs.add(operation["id"])
                    break
        # leafIDs represent the ID of the child operation
        leafIDs = list(operIDs.difference(nodeIDs))
        # OrderID list the IDs of the operations in a sequention order of execution
        orderID = []
        orderID.extend(leafIDs)
        # Loop through the child operation upwards to determine the parents in the sequence
        for id in leafIDs:
            WorkflowUtils.recursiveF(connections, orderID, id)
        return orderID

    def executeOperation(workflow):
        operations = workflow[0]["operations"]
        orderIDs = WorkflowUtils.getExecutionOrder(workflow)
        outputs = {}
        j = 1
        result = []
        for id in orderIDs:
            operation = WorkflowUtils.getOperationByID(id, operations)
            if len(outputs) > 0:
                for i in range(0, len(operation["inputs"])):
                    if "_to_" in operation["inputs"][i]["value"]:
                        value = operation["inputs"][i]["value"].split("_to_")
                        operation["inputs"][i]["value"] = outputs[value[0]][0]
            output = ""
            if operation["metadata"]["resource"] == "WPS":
                if operation['outputs'][0]['type'] == "geom":
                    output = WorkflowUtils.executeWPS(operation, 'application/json')
                elif operation['outputs'][0]['type'] == "coverage":
                    output = WorkflowUtils.executeWPS(operation, 'image/tiff')
                else:
                    output = WorkflowUtils.executeWPS(operation)

            if operation["metadata"]["resource"] == "REST":
                output = WorkflowUtils.executeREST(operation)
                if output is not None:
                    output = "http://"+addr+":82/WorkflowApp/app/api/"+output

            if operation["metadata"]["resource"] == "ILWIS":
                output = WorkflowUtils.executeILWIS(operation)
                if output is not None:
                    output = "http://"+addr+":82/WorkflowApp/app/api/" + json.loads(output)["path"]

            if operation["metadata"]["resource"] == "GeoServer":
                output = WorkflowUtils.publishRaster(operation)
                if output is not None:
                    output = json.loads(output)

            outputs[str(id)] = [output]
            result.append({"type": operation["outputs"][0]["type"], "data":output, "id": id})
            j = j + 1
        return result
    def getOperation(tool, searchString):
        json_data = open("operations.json").read()
        operations = json.loads(json_data)[tool]
        max = 0
        oper = None
        for operation in operations:
            count = 0
            for keyword in operation["keywords"]:
                if keyword in searchString:
                    count = count + 1
            if count > max:
                max = count
                oper = operation
        return {"hits": max, "operation": oper }
    def getWpsProcesses(url):
        """This function return the WPS processes in a given WPS server"""
        if url is None:
            url = "http://130.89.221.193:85/geoserver/ows?"
        results = requests.get(url + "service=WPS&request=GetCapabilities")
        if results.text == "":
            results = []
        jsonResponse = xmltodict.parse(results.text)
        processes = []
        count = 1
        for row in jsonResponse['wps:Capabilities']['wps:ProcessOfferings']['wps:Process']:
            process = {}
            identifier = row['ows:Identifier']
            if "gs:" in identifier or "52north.org" in url or "ilwis_server" in url:
                process['id'] = identifier
                metadata = {}
                title = row['ows:Title']
                metadata['label'] = identifier
                if "org.n52" in title:
                    title = title.split(".")
                    title = title[len(title)-1]
                metadata['longname'] = title
                metadata['resource'] = 'WPS'
                metadata['url'] = url
                abstract = ""
                if 'ows:Abstract' in row:
                    abstract = row['ows:Abstract']
                metadata['description'] = abstract
                process['metadata'] = metadata
                response = requests.get(url + "service=WPS&request=DescribeProcess&identifier=" + identifier)
                response = xmltodict.parse(response.text)
                json2 = json.dumps(response)
                b = json.loads(json2)
                if 'ProcessDescription' in b['wps:ProcessDescriptions']:
                    if type(b['wps:ProcessDescriptions']['ProcessDescription']['DataInputs']) == dict:
                        inputs = b['wps:ProcessDescriptions']['ProcessDescription']['DataInputs']['Input']
                    if type(b['wps:ProcessDescriptions']['ProcessDescription']['DataInputs']) == list:
                        inputs = b['wps:ProcessDescriptions']['ProcessDescription']['DataInputs'][0]['Input']
                    if type(inputs) == dict:
                        input = {}
                        input['id'] = 0
                        input['identifier'] = inputs['ows:Identifier']
                        input['name'] = inputs['ows:Title']
                        input['url'] = ""
                        input['value'] = ""
                        if inputs['@minOccurs'] == '0':
                            input['optional'] = True
                        else:
                            input['optional'] = False
                        if 'ComplexData' in inputs:
                            if "text/xml" in str(inputs['ComplexData']['Default']['Format']['MimeType']):
                                input['type'] = "geom"
                            elif "image" in str(inputs['ComplexData']['Default']['Format']['MimeType']):
                                input['type'] = "coverage"
                            else:
                                input['type'] = inputs['ComplexData']['Default']['Format']

                        if 'LiteralData' in inputs:
                            if 'ows:DataType' in inputs['LiteralData']:
                                input['type'] = inputs['LiteralData']['ows:DataType']['#text']
                            elif 'ows:AllowedValues' in inputs['LiteralData']:
                                input['type'] = inputs['LiteralData']['ows:AllowedValues']
                            else:
                                input['type'] = inputs['LiteralData']
                        if 'ows:Abstract' in inputs:
                            input['description'] = inputs['ows:Abstract']
                        else:
                            input['description'] = ""
                        process['metadata']['inputparametercount'] = 1
                        process['inputs'] = [input]
                    else:
                        inputList = []
                        i = 0
                        for item in inputs:
                            input = {}
                            input['id'] = i
                            input['identifier'] = item['ows:Identifier']
                            input['name'] = item['ows:Title']
                            if 'ows:Abstract' in item:
                                input['description'] = item['ows:Abstract']
                            else:
                                input['description'] = ""
                            input['url'] = ""
                            input['value'] = ""
                            if '@minOccurs' in item:
                                if item['@minOccurs'] == '0':
                                    input['optional'] = True
                                else:
                                    input['optional'] = False
                            else:
                                input['optional'] = False
                            if 'ComplexData' in item:
                                if "text/xml" in str(item['ComplexData']['Default']['Format']['MimeType']):
                                    input['type'] = "geom"
                                elif "image" in str(item['ComplexData']['Default']['Format']['MimeType']):
                                    input['type'] = "coverage"
                                else:
                                    input['type'] = item['ComplexData']['Default']['Format']

                            if 'LiteralData' in item and item['LiteralData'] is not None:
                                if 'ows:DataType' in item['LiteralData']:
                                    if '@ows:reference' in item['LiteralData']['ows:DataType']:
                                        input['type'] = item['LiteralData']['ows:DataType']['#text']
                                    else:
                                        input['type'] = item['LiteralData']['ows:DataType']
                                elif 'ows:AllowedValues' in item['LiteralData']:
                                    input['type'] = '|'.join(item['LiteralData']['ows:AllowedValues']['ows:Value'])
                                else:
                                    if '@ows:reference' in item['LiteralData']:
                                        input['type'] = item['LiteralData']['@ows:reference']
                                    else:
                                        input['type'] = "text"
                            inputList.append(input)
                            i = i + 1
                        process['metadata']['inputparametercount'] = len(inputList)
                        process['inputs'] = inputList

                    if 'ProcessOutputs' not in b['wps:ProcessDescriptions']['ProcessDescription'] or 'Output' not in b['wps:ProcessDescriptions']['ProcessDescription']['ProcessOutputs']:
                        output = {}
                        output['id'] = 0
                        output['identifier'] = ""
                        output['name'] = ""
                        output['value'] = ""
                        output['description'] = ""
                        output['type'] = ""
                        process['metadata']['outputparametercount'] = 1
                        process['outputs'] = [output]
                    else:
                        outputs = b['wps:ProcessDescriptions']['ProcessDescription']['ProcessOutputs']['Output']
                        if type(outputs) == dict:
                            output = {}
                            output['id'] = 0
                            output['identifier'] = outputs['ows:Identifier']
                            output['name'] = outputs['ows:Title']
                            output['value'] = ""
                            output['description'] = outputs['ows:Title']
                            if 'ComplexOutput' in outputs:
                                if "text/xml" in str(outputs['ComplexOutput']['Default']['Format']['MimeType']):
                                    output['type'] = "geom"
                                elif "image" in str(outputs['ComplexOutput']['Default']['Format']['MimeType']):
                                    output['type'] = "coverage"
                                else:
                                    output['type'] = outputs['ComplexOutput']['Default']['Format']

                            if 'LiteralOutput' in outputs:
                                if outputs['LiteralOutput'] is None:
                                    output['type'] = outputs['LiteralOutput']
                                else:
                                    if 'ows:DataType' in outputs['LiteralOutput']:
                                        output['type'] = outputs['LiteralOutput']['ows:DataType']
                                    else:
                                        output['type'] = outputs['LiteralOutput']

                            process['metadata']['outputparametercount'] = 1
                            process['outputs'] = [output]
                        else:
                            outputList = []
                            i = 0
                            for item in outputs:
                                output = {}
                                output['id'] = i
                                output['identifier'] = item['ows:Identifier']
                                output['name'] = item['ows:Title']
                                output['value'] = ""
                                output['description'] = item['ows:Title']
                                if 'ComplexOutput' in item:
                                    if "text/xml" in str(item['ComplexOutput']['Default']['Format']['MimeType']):
                                        output['type'] = "geom"
                                    elif "image" in str(item['ComplexOutput']['Default']['Format']['MimeType']):
                                        output['type'] = "coverage"
                                    else:
                                        output['type'] = item['ComplexOutput']['Default']['Format']

                                if 'LiteralOutput' in item:
                                    if item['LiteralOutput'] is None:
                                        output['datatype'] = item['LiteralOutput']
                                    else:
                                        if 'ows:DataType' in item['LiteralOutput']:
                                            output['type'] = item['LiteralOutput']['ows:DataType']
                                        else:
                                            output['type'] = item['LiteralOutput']
                                outputList.append(output)
                                i = i + 1
                            process['metadata']['outputparametercount'] = len(outputList)
                            process['outputs'] = outputList
                        processes.append(process)
                    count = count + 1
                    if count == 100:
                        break
        return processes
    def getoldWpsProcesses(url):
        if url is None:
            url = "http://130.89.221.193:85/geoserver/ows?"
        results = requests.get(url + "service=WPS&request=GetCapabilities")
        if results.text == "":
            results = []
        xpars = xmltodict.parse(results.text)
        json1 = json.dumps(xpars)
        d = json.loads(json1)
        processes = []
        count = 1
        for row in d['wps:Capabilities']['wps:ProcessOfferings']['wps:Process']:
            process = {}
            identifier = row['ows:Identifier']
            if "gs:" in identifier or "52north.org" in url:
                process['id'] = identifier
                metadata = {}
                title = row['ows:Title']
                metadata['label'] = identifier

                if "org.n52" in title:
                    title = title.split(".")
                    title = title[len(title)-1]
                metadata['longname'] = title
                metadata['resource'] = 'WPS'
                metadata['url'] = url
                abstract = ""
                if 'ows:Abstract' in row:
                    abstract = row['ows:Abstract']
                metadata['description'] = abstract
                process['metadata'] = metadata
                response = requests.get(url + "service=WPS&request=DescribeProcess&identifier=" + identifier)
                response = xmltodict.parse(response.text)
                json2 = json.dumps(response)
                b = json.loads(json2)
                inputs = b['wps:ProcessDescriptions']['ProcessDescription']['DataInputs']['Input']
                if type(inputs) == dict:
                    input = {}
                    input['id'] = 0
                    input['identifier'] = inputs['ows:Identifier']
                    input['name'] = inputs['ows:Title']
                    input['url'] = ""
                    input['value'] = ""
                    if inputs['@minOccurs'] == '0':
                        input['optional'] = True
                    else:
                        input['optional'] = False
                    if 'ComplexData' in inputs:
                        if "text/xml" in str(inputs['ComplexData']['Default']['Format']['MimeType']):
                            input['type'] = "geom"
                        elif "image" in str(inputs['ComplexData']['Default']['Format']['MimeType']):
                            input['type'] = "coverage"
                        else:
                            input['type'] = inputs['ComplexData']['Default']['Format']

                    if 'LiteralData' in inputs:
                        if 'ows:DataType' in inputs['LiteralData']:
                            input['type'] = inputs['LiteralData']['ows:DataType']
                        elif 'ows:AllowedValues' in inputs['LiteralData']:
                            input['type'] = inputs['LiteralData']['ows:AllowedValues']
                        else:
                            input['type'] = inputs['LiteralData']
                    if 'ows:Abstract' in inputs:
                        input['description'] = inputs['ows:Abstract']
                    else:
                        input['description'] = ""
                    process['metadata']['inputparametercount'] = 1
                    process['inputs'] = [input]
                else:
                    inputList = []
                    i = 0
                    for item in inputs:
                        input = {}
                        input['id'] = i
                        input['identifier'] = item['ows:Identifier']
                        input['name'] = item['ows:Title']
                        if 'ows:Abstract' in item:
                            input['description'] = item['ows:Abstract']
                        else:
                            input['description'] = ""
                        input['url'] = ""
                        input['value'] = ""
                        if '@minOccurs' in item:
                            if item['@minOccurs'] == '0':
                                input['optional'] = True
                            else:
                                input['optional'] = False
                        else:
                            input['optional'] = False
                        if 'ComplexData' in item:
                            if "text/xml" in str(item['ComplexData']['Default']['Format']['MimeType']):
                                input['type'] = "geom"
                            elif "image" in str(item['ComplexData']['Default']['Format']['MimeType']):
                                input['type'] = "coverage"
                            else:
                                input['type'] = item['ComplexData']['Default']['Format']

                        if 'LiteralData' in item:
                            if 'ows:DataType' in item['LiteralData']:
                                if '@ows:reference' in item['LiteralData']['ows:DataType']:
                                    input['type'] = item['LiteralData']['ows:DataType']['@ows:reference']
                                else:
                                    input['type'] = item['LiteralData']['ows:DataType']
                            elif 'ows:AllowedValues' in item['LiteralData']:
                                input['type'] = '|'.join(item['LiteralData']['ows:AllowedValues']['ows:Value'])
                            else:
                                if '@ows:reference' in item['LiteralData']:
                                    input['type'] = item['LiteralData']['@ows:reference']
                                else:
                                    input['type'] = item['LiteralData']
                        inputList.append(input)
                        i = i + 1
                    process['metadata']['inputparametercount'] = len(inputList)
                    process['inputs'] = inputList

                if b['wps:ProcessDescriptions']['ProcessDescription']['ProcessOutputs'] is None:
                    output = {}
                    output['id'] = 0
                    output['identifier'] = ""
                    output['name'] = ""
                    output['value'] = ""
                    output['description'] = ""
                    output['type'] = ""
                    process['metadata']['outputparametercount'] = 1
                    process['outputs'] = [output]
                else:
                    outputs = b['wps:ProcessDescriptions']['ProcessDescription']['ProcessOutputs']['Output']
                    if type(outputs) == dict:
                        output = {}
                        output['id'] = 0
                        output['identifier'] = outputs['ows:Identifier']
                        output['name'] = outputs['ows:Title']
                        output['value'] = ""
                        output['description'] = outputs['ows:Title']
                        if 'ComplexOutput' in outputs:
                            if "text/xml" in str(outputs['ComplexOutput']['Default']['Format']['MimeType']):
                                output['type'] = "geom"
                            elif "image" in str(outputs['ComplexOutput']['Default']['Format']['MimeType']):
                                output['type'] = "coverage"
                            else:
                                output['type'] = outputs['ComplexOutput']['Default']['Format']

                        if 'LiteralOutput' in outputs:
                            if outputs['LiteralOutput'] is None:
                                output['type'] = outputs['LiteralOutput']
                            else:
                                if 'ows:DataType' in outputs['LiteralOutput']:
                                    output['type'] = outputs['LiteralOutput']['ows:DataType']
                                else:
                                    output['type'] = outputs['LiteralOutput']

                        process['metadata']['outputparametercount'] = 1
                        process['outputs'] = [output]
                    else:
                        outputList = []
                        i = 0
                        for item in outputs:
                            output = {}
                            output['id'] = i
                            output['identifier'] = item['ows:Identifier']
                            output['name'] = item['ows:Title']
                            output['value'] = ""
                            output['description'] = item['ows:Title']
                            if 'ComplexOutput' in item:
                                if "text/xml" in str(item['ComplexOutput']['Default']['Format']['MimeType']):
                                    output['type'] = "geom"
                                elif "image" in str(item['ComplexOutput']['Default']['Format']['MimeType']):
                                    output['type'] = "coverage"
                                else:
                                    output['type'] = item['ComplexOutput']['Default']['Format']

                            if 'LiteralOutput' in item:
                                if item['LiteralOutput'] is None:
                                    output['datatype'] = item['LiteralOutput']
                                else:
                                    if 'ows:DataType' in item['LiteralOutput']:
                                        output['type'] = item['LiteralOutput']['ows:DataType']
                                    else:
                                        output['type'] = item['LiteralOutput']
                            outputList.append(output)
                            i = i + 1
                        process['metadata']['outputparametercount'] = len(outputList)
                        process['outputs'] = outputList
                    processes.append(process)
                count = count + 1
                if count == 100:
                    break
        return processes
    def getIlwisProcesses(self):
        xml_data = open("ilwis_operations.xml").read()
        xpars = xmltodict.parse(xml_data)
        json1 = json.dumps(xpars)
        d = json.loads(json1)
        processes = []
        i = 0
        def getRepeatedOperationCount(name, operations):
            count = 0
            for operation in operations:
                if operation['metadata']['label'] == name:
                    count = count + 1
            return count

        def isRepeated(description, operations):
            repeated = False
            for operation in operations:
                if operation['metadata']['description'] == description:
                    repeated = True
            return repeated
        for row in d['operations']['operation']:
            process = {}
            metadata = {}
            count = getRepeatedOperationCount(row['name'], processes)
            if count == 0:
                metadata['longname'] = row['name']
                process['id'] = row['name']
            else:
                metadata['longname'] = row['name']+str(count+1)
                process['id'] = row['name']+str(count+1)

            metadata['label'] = row['name']
            metadata['resource'] = 'ILWIS'
            metadata['url'] = "http://130.89.221.193:75/ilwisoperations"
            if 'longname' in row:
                metadata['description'] = row['longname']
            else:
                metadata['description'] = ''
            process['metadata'] = metadata
            inputList = []
            if row['input_parameters'] is not None:
                inputs = row['input_parameters']['parameter']
                j = 0
                if type(inputs) is list:
                    for item in inputs:
                        input = {}
                        input['id'] = j
                        if type(item) is dict:
                            input['name'] = item['name']
                            input['identifier'] = item['name']
                            if 'desc' in item:
                                input['description'] = item['desc']

                            else:
                                input['description'] = ""
                            input['url'] = ""
                            input['value'] = ""
                            if 'optional' in item:
                                input['optional'] = True if item['optional'].lower() == "true" else False
                            else:
                                input['optional'] = True
                            if type(item['types']['type']) is list:
                                if 'RasterCoverage' in item['types']['type']:
                                    input['type'] = 'coverage'
                                elif 'FeatureCoverage' in item['types']['type'] or 'PolygonCoverage' in item['types']['type'] or 'LineCoverage' in item['types']['type'] or 'PointCoverage' in item['types']['type']:
                                    input['type'] = 'geom'
                                else:
                                    input['type'] = item['types']['type'][0]
                            else:
                                if item['types']['type'] == 'RasterCoverage':
                                    input['type'] = 'coverage'
                                elif item['types']['type'] == 'FeatureCoverage' or item['types']['type'] == 'PolygonCoverage' or item['types']['type'] == 'LineCoverage' or item['types']['type'] == 'PointCoverage':
                                    input['type'] = 'geom'
                                else:
                                    input['type'] = item['types']['type']
                        inputList.append(input)
                        j = j + 1
                else:
                    input = {}
                    input['id'] = j
                    input['name'] = inputs['name']
                    input['identifier'] = inputs['name']
                    if 'desc' in inputs:
                        input['description'] = inputs['desc']
                    else:
                        input['description'] = ""
                    input['url'] = ""
                    input['value'] = ""
                    if 'optional' in inputs:
                        input['optional'] = True if inputs['optional'].lower() == "true" else False
                    else:
                        input['optional'] = True
                    if type(inputs['types']['type']) is list:
                        if 'RasterCoverage' in inputs['types']['type']:
                            input['type'] = 'coverage'
                        elif 'FeatureCoverage' in inputs['types']['type'] or 'PolygonCoverage' in item['types']['type'] or 'LineCoverage' in item['types']['type'] or 'PointCoverage' in item['types']['type']:
                            input['type'] = 'geom'
                        else:
                            input['type'] = inputs['types']['type'][0]
                    else:
                        if item['types']['type'] == 'RasterCoverage':
                            input['type'] = 'coverage'
                        elif item['types']['type'] == 'FeatureCoverage' or item['types']['type'] == 'PolygonCoverage' or item['types']['type'] == 'LineCoverage' or item['types']['type'] == 'PointCoverage':
                            input['type'] = 'geom'
                        else:
                            input['type'] = inputs['types']['type']
                    inputList.append(input)
                    j = j + 1
            process['metadata']['inputparametercount'] = len(inputList)
            process['inputs'] = inputList

            outputList = []
            if row['output_parameters'] is not None:
                outputs = row['output_parameters']['parameter']
                j = 0
                if type(outputs) is list:
                    for item in outputs:
                        output = {}
                        if type(item) is dict:
                            output['id'] = j
                            output['identifier'] = item['name']
                            output['name'] = item['name']
                            if 'desc' in item:
                                output['description'] = item['desc']
                            else:
                                output['description'] = ""
                            output['url'] = ""
                            output['value'] = ""
                            output['optional'] = item['optional']
                            if type(item['types']['type']) is list:
                                if 'RasterCoverage' in item['types']['type'][0]:
                                    output['type'] = 'coverage'
                                elif 'FeatureCoverage' in item['types']['type'][0]:
                                    output['type'] = 'geom'
                                else:
                                    output['type'] = item['types']['type'][0]
                            else:
                                if item['types']['type'] == 'RasterCoverage':
                                    output['type'] = 'coverage'
                                elif item['types']['type'] == 'FeatureCoverage':
                                    output['type'] = 'geom'
                                else:
                                    output['type'] = item['types']['type']
                        else:
                            output['id'] = j
                            output['identifier'] = item['name'][0]
                            output['name'] = item['name'][0]
                            if 'desc' in item:
                                output['description'] = item['desc'][0]
                            else:
                                output['description'] = ''
                            output['url'] = ""
                            output['value'] = ""
                            output['optional'] = item['optional'][0]
                            if type(item['types']['type'][0]) is list:
                                if 'RasterCoverage' in item['types']['type'][0][0]:
                                    output['type'] = 'coverage'
                                elif 'FeatureCoverage' in item['types']['type'][0][0]:
                                    output['type'] = 'geom'
                                else:
                                    output['type'] = item['types']['type'][0][0]
                            else:
                                if item['types']['type'][0] == 'RasterCoverage':
                                    output['type'] = 'coverage'
                                elif item['types']['type'][0] == 'FeatureCoverage':
                                    output['type'] = 'geom'
                                else:
                                    output['type'] = item['types']['type'][0]
                        outputList.append(output)
                        i = j + 1
                else:
                    output = {}
                    output['id'] = 0
                    if 'name' in outputs:
                        output['identifier'] = outputs['name']
                        output['name'] = outputs['name']
                    else:
                        output['name'] = 'Input'
                        output['identifier'] = 'Input'
                    if 'desc' in outputs:
                        output['description'] = outputs['desc']
                    else:
                        output['description'] = ""
                    output['value'] = ""
                    if type(outputs['types']['type']) is list:
                        if 'RasterCoverage' in outputs['types']['type'][0]:
                            output['type'] = 'coverage'
                        elif 'FeatureCoverage' in outputs['types']['type'][0]:
                            output['type'] = 'geom'
                        else:
                            output['type'] = outputs['types']['type'][0]
                    else:
                        if outputs['types']['type'] == 'RasterCoverage':
                            output['type'] = 'coverage'
                        elif outputs['types']['type'] == 'FeatureCoverage':
                            output['type'] = 'geom'
                        else:
                            output['type'] = outputs['types']['type']
                    outputList.append(output)

            process['metadata']['outputparametercount'] = len(outputList)
            process['outputs'] = outputList

            if isRepeated(process['metadata']['description'], processes) == False:
                j = 0
                for input in process['inputs']:
                    if 'Rast' in input['type']:
                        process['inputs'][j]['type'] = 'coverage'
                    elif 'Feature' in input['type']:
                        process['inputs'][j]['type'] = 'geom'
                    elif 'Polygon' in input['type']:
                        process['inputs'][j]['type'] = 'geom'
                    elif 'Point' in input['type']:
                        process['inputs'][j]['type'] = 'geom'
                    elif 'Line' in input['type']:
                        process['inputs'][j]['type'] = 'geom'
                    j = j + 1

                j = 0
                for output in process['outputs']:
                    if 'Rast' in output['type']:
                        process['inputs'][j]['type'] = 'coverage'
                    elif 'Feature' in output['type']:
                        process['outputs'][j]['type'] = 'geom'
                    elif 'Polygon' in output['type']:
                        process['outputs'][j]['type'] = 'geom'
                    elif 'Point' in output['type']:
                        process['outputs'][j]['type'] = 'geom'
                    elif 'Line' in output['type']:
                        process['outputs'][j]['type'] = 'geom'
                    j = j + 1

                processes.append(process)
            i = i + 1
        return processes
    def getOperationByLabel(tool, label):
        json_data = open("operations.json").read()
        operations = json.loads(json_data)[tool]
        oper = None
        for operation in operations:
            if operation['label'] == label:
                oper = operation
        return oper
    def piwToQgisWorkflow(workflow):
        workflowJSON = json.loads(workflow)
        qgisJSON = {}
        values = {}
        # Workflow inputs
        inputs = {}
        algos = {}
        for operation in workflowJSON['workflows'][0]['operations']:
            consoleName = operation['metadata']['url']
            first = WorkflowUtils.getOperation("QGIS", operation['metadata']['longname'].lower())
            second = WorkflowUtils.getOperation("QGIS", operation['metadata']['description'].lower())
            third = WorkflowUtils.getOperation("QGIS", operation['metadata']['label'].lower())

            all = {first["hits"]: first, second["hits"]: second, third["hits"] : third}
            keys = list(all.keys())
            outputType = ""
            if first["hits"] >= second["hits"]:
                consoleName = first["operation"]["label"]
                outputType = first["operation"]["outputs"][0]
            else:
                consoleName = second["operation"]["label"]
                outputType = second["operation"]["outputs"][0]
            params = {}
            for input in operation['inputs']:
                if input['optional'] == False:
                    if "_to_" not in input['value'] and (input['type'] == 'geom' or input['type'] == 'coverage'):
                        inputs[input['name']+str(operation["id"])] = {
                            "values": {
                                "pos": {
                                    "values": {
                                        "x": operation["metadata"]["position"][0],
                                        "y": operation["metadata"]["position"][1]
                                    },
                                    "class": "point"
                                },
                                "param": {
                                    "values": {
                                        "isAdvanced": False,
                                        "name": input['name']+str(operation["id"]),
                                        "default": "",
                                        "value": "",
                                        "exported": "",
                                        "hidden": False,
                                        "optional": input['optional'],
                                        "description": input['description']
                                    },
                                    "class": "processing.core.parameters.ParameterRaster" if input['type'] == "coverage" else "processing.core.parameters.ParameterVector"
                                }
                            },
                            "class": "processing.modeler.ModelerAlgorithm.ModelerParameter"
                        }
                        if input['type'] == "coverage":
                            inputs[input['name']+str(operation["id"])]["values"]["param"]["values"]["showSublayersDialog"] = True
                            if "GRIDS" in params:
                                grids = params["GRIDS"]
                                grids.append({
                                    "values": {
                                        "name": input['name']+str(operation["id"])
                                    },
                                    "class": "processing.modeler.ModelerAlgorithm.ValueFromInput"
                                })
                                params["GRIDS"] = grids
                            else:
                                params["_RESAMPLING"] = 3
                                params["GRIDS"] = [
                                    {
                                        "values": {
                                            "name": input['name']+str(operation["id"])
                                        },
                                        "class": "processing.modeler.ModelerAlgorithm.ValueFromInput"
                                    }
                                ]
                        elif input['type'] == "geom":
                            inputs[input['name']+str(operation["id"])]["values"]["param"]["values"]["shapetype"] = [-1]
                            params["INPUT_LAYER"] = {
                                "values": {
                                    "name": input['name']+str(operation["id"])
                                },
                                "class": "processing.modeler.ModelerAlgorithm.ValueFromInput"
                            }
                    elif "_to_" not in input['value'] and (input['type'] != 'geom' and input['type'] != 'coverage'):
                        #if input["identifier"] == "":
                        params[input["identifier"].upper()] = input["value"]
                    if "_to_" in input['value']:
                        fromOperID = input["value"].split("_to_")[0]
                        fromOper = WorkflowUtils.getOperationByID(fromOperID, workflowJSON['workflows'][0]['operations'])
                        # If output is coverage
                        if outputType == 'coverage':
                            if "GRIDS" in params:
                                grids = params["GRIDS"]
                                grids.append({
                                    "values": {
                                            "alg": fromOper['metadata']['longname']+str(fromOper["id"]),
                                            "output": fromOper['outputs'][0]['name']+str(fromOper["id"])
                                        },
                                        "class": "processing.modeler.ModelerAlgorithm.ValueFromOutput"
                                })
                                params["GRIDS"] = grids
                            else:
                                params["_RESAMPLING"] = 3
                                params["GRIDS"] = [
                                    {
                                        "values": {
                                            "alg": fromOper['metadata']['longname']+str(fromOper["id"]),
                                            "output": fromOper['outputs'][0]['name']+str(fromOper["id"])
                                        },
                                        "class": "processing.modeler.ModelerAlgorithm.ValueFromOutput"
                                    }
                                ]
                        elif outputType == 'geom':
                            params["INPUT_LAYER"] = {
                                "values": {
                                    "alg": fromOper['metadata']['longname']+str(fromOper["id"]),
                                    "output": fromOper['outputs'][0]['name']+str(fromOper["id"])
                                },
                                "class": "processing.modeler.ModelerAlgorithm.ValueFromOutput"
                            }
                        else:# Just because there is no ouput datatype, assume it is a geom field
                            params["INPUT_LAYER"] = {
                                "values": {
                                    "alg": fromOper['metadata']['longname'] + str(fromOper["id"]),
                                    "output": fromOper['outputs'][0]['name'] + str(fromOper["id"])
                                },
                                "class": "processing.modeler.ModelerAlgorithm.ValueFromOutput"
                            }

                else:
                    #params[input["identifier"].upper()] = input["value"]
                    pass

            outputs = {}
            for output in operation['outputs']:
                if output['type'] == 'geom' or outputType == 'geom':
                    outputs['OUTPUT_LAYER'] = {
                        "values": {
                            "description": output['description'],
                            "pos": {
                                "values": {
                                    "x": operation["metadata"]["position"][0],
                                    "y": operation["metadata"]["position"][1]
                                },
                                "class": "point"
                            }
                        },
                        "class": "processing.modeler.ModelerAlgorithm.ModelerOutput"
                    }
                elif output['type'] == 'coverage' or outputType == 'coverage':
                    outputs["RESULT"] = {
                        "values": {
                            "description": output['description'],
                            "pos": {
                                "values": {
                                    "x": operation["metadata"]["position"][0],
                                    "y": operation["metadata"]["position"][1]
                                },
                                "class": "point"
                            }
                        },
                        "class": "processing.modeler.ModelerAlgorithm.ModelerOutput"
                    }

            longname = operation['metadata']['longname']+str(operation["id"])
            algos[longname] = {
                "values": {
                    "name": longname,
                    "paramsFolded": True,
                    "outputs": outputs,
                    "outputsFolded": True,
                    "pos": {
                        "values": {
                            "x": operation["metadata"]["position"][0],
                            "y": operation["metadata"]["position"][1]
                        },
                        "class": "point"
                    },
                    "dependencies": [],
                    "params": params,
                    "active": True,
                    "consoleName": consoleName,
                    "description": operation['metadata']['description']
                },
                "class": "processing.modeler.ModelerAlgorithm.Algorithm"
            }

        values["inputs"] = inputs
        # Description or Help Information
        values["helpContent"] = {}
        # Dont seem to know
        values["group"] = workflowJSON['workflows'][0]['metadata']['longname']
        values["name"] = workflowJSON['workflows'][0]['metadata']['longname']
        # Algorithm or processes
        values["algs"] = algos
        qgisJSON["values"] = values
        qgisJSON["class"] = "processing.modeler.ModelerAlgorithm.ModelerAlgorithm"
        return json.dumps(qgisJSON)
    def QgisWorkflowToPIW(qgisworkflow):
        def extractNumericsfromString(string):
            if len(string) == 0:
                return string
            else:
                num = string[len(string)-1]
                if num in "0 1 2 3 4 5 6 7 8 9":
                    string = string[0:len(string)-1]
                    return extractNumericsfromString(string)
                else:
                    return string
        jsonData = json.loads(qgisworkflow)
        workflows = {}
        workflow = {}
        workflow["id"] = 0

        workflow["metadata"] = {
            "longname": jsonData["values"]["name"]
        }
        inputItems = jsonData["values"]["inputs"]
        algos = jsonData["values"]["algs"]
        i = 0
        operations = []
        for key in algos:
            operation = {}
            algo = algos[key]
            operation["id"] = i
            params = algo["values"]["params"]
            count = 0
            inputs = []
            # Loop through the input parameters assigne to the algorithm
            for param in params:
                input = {}
                # Check if the input is of type list or dict
                if type(params[param]) == list:
                    count = count + len(params[param])
                    # If parameters are list, loop through
                    for item in params[param]:
                        value = ""
                        description = ""
                        optional = True
                        datatype = "text"
                        name = ""
                        url = ""
                        identifier = ""
                        # Check if input is from connection
                        if item['class'] == "processing.modeler.ModelerAlgorithm.ValueFromInput":
                            description = inputItems[item["values"]["name"]]["values"]["param"]["values"]["description"]
                            optional = inputItems[item["values"]["name"]]["values"]["param"]["values"]["optional"]
                            if inputItems[item["values"]["name"]]["values"]["param"][
                                "class"] == "processing.core.parameters.ParameterRaster":
                                datatype = "coverage"
                                identifier = datatype
                            if inputItems[item["values"]["name"]]["values"]["param"][
                                "class"] == "processing.core.parameters.ParameterVector":
                                datatype = "geom"
                                identifier = "features"
                            name = item["values"]["name"]
                        else:
                            url = item["values"]["alg"]
                            value = url
                            name = item["values"]["output"]
                        inputs.append({
                            "id": len(inputs),
                            "name": name,
                            "url": "",
                            "value": value,
                            "description": description,
                            "type": datatype,
                            "identifier": name if identifier == "" else identifier,
                            "optional": optional
                        })
                elif type(params[param]) == dict:
                    value = ""
                    description = ""
                    optional = True
                    datatype = "text"
                    name = ""
                    identifier = ""
                    # If the input is passed during execution time
                    if params[param]['class'] == "processing.modeler.ModelerAlgorithm.ValueFromInput":
                        name = params[param]['values']['name']
                        description = inputItems[name]["values"]["param"]["values"]["description"]
                        optional = inputItems[name]["values"]["param"]["values"]["optional"]
                        # Is input of raster type
                        if inputItems[name]["values"]["param"]["class"] == "processing.core.parameters.ParameterRaster":
                            datatype = "coverage"
                            identifier = "coverage"
                        # Is input of Vector type
                        if inputItems[name]["values"]["param"]["class"] == "processing.core.parameters.ParameterVector":
                            datatype = "geom"
                            identifier = "features"

                    # The input is passed from output of another operation
                    else:
                        name = params[param]["values"]["alg"]
                        value = name
                        datatype = "geom"
                        optional = False
                    inputs.append({
                        "id": len(inputs),
                        "name": param,
                        "value": value,
                        "url": "",
                        "description": description,
                        "type": datatype,
                        "identifier": param if identifier == "" else identifier,
                        "optional": optional
                    })
                else:
                    # The input is not attached at run time or from output of another operation
                    # Not possible to know the type and optional values of the input
                    # These are given default values
                    inputs.append({
                        "id": len(inputs),
                        "name": param,
                        "value": params[param],
                        "description": "",
                        "type": "text",
                        "identifier": param,
                        "url": "",
                        "optional": True
                    })
                    count = count + 1

            outputs = []
            if len(algo["values"]["outputs"]) > 0:
                if type(algo["values"]["outputs"]) == dict:
                    for output in algo["values"]["outputs"]:
                        outputs.append({
                            "id": len(outputs),
                            "name": output,
                            "value": output,
                            "description": algo["values"]["outputs"][output]["values"]["description"],
                            "type": WorkflowUtils.getOperationByLabel("QGIS", algo["values"]["consoleName"])["outputs"][0],
                            "identifier": "result",
                            "url": ""
                        })
                if type(algo["values"]["outputs"]) == list:
                    for output in algo["values"]["outputs"]:
                        outputs.append({
                            "id": len(outputs),
                            "name": output["values"]["name"],
                            "value": output["values"]["name"],
                            "type": WorkflowUtils.getOperationByLabel("QGIS", algo["values"]["consoleName"])["outputs"][0],
                            "identifier": "result",
                            "description": "result",
                            "url": ""
                        })
            else:
                outputs.append({
                    "id": len(outputs),
                    "name": "result",
                    "value": "result",
                    "type": WorkflowUtils.getOperationByLabel("QGIS", algo["values"]["consoleName"])["outputs"][0],
                    "identifier": "result",
                    "description": "result",
                    "url": ""
                })
            metadata = {
                "longname": key,
                "label": algo["values"]["consoleName"],
                "url": "",
                "resource": "",
                "description": algo["values"]["description"],
                "inputparametercount": len(inputs),
                "outputparametercount": len(outputs),
                "position": [
                    algo["values"]["pos"]["values"]["x"],
                    algo["values"]["pos"]["values"]["y"]
                ]
            }
            operation["metadata"] = metadata
            operation["inputs"] = inputs
            operation["outputs"] = outputs
            operations.append(operation)
            i = i + 1

        workflow["operations"] = operations
        workflows["workflows"] = [workflow]

        connections = []
        # from operation
        i = 0
        operA = operations
        for operation in workflow["operations"]:
            # to operation
            for oper in operations:
                # to parameter
                j = 0
                for input in operation["inputs"]:
                    if input["value"] == oper["metadata"]["longname"]:
                        workflow["operations"][i]["inputs"][j]["value"] = str(oper["id"])+"_to_"+str(input["id"])
                        connections.append({
                            "fromOperationID": oper["id"],
                            "toOperationID": operation["id"],
                            "fromParameterID": 0,
                            "toParameterID": input["id"]
                        })
                    j = j + 1
            i = i + 1

        workflow["connections"] = connections

        # Order inputs since QGIS does not keep the order of inputs
        # First in the sequence is the connected inputs (from output of other operations)
        # Followed by the geoms
        i = 0
        for operation in workflow["operations"]:
            inputs = []
            inputNonConn = []
            for input in operation["inputs"]:
                if "_to_" in str(input["value"]):
                    inputs.append(input)
                else:
                    inputNonConn.append(input)
            nonGeomRas = []
            for input in inputNonConn:
                if input['type'] == 'geom' or input['type'] == 'coverage':
                    inputs.append(input)
                else:
                    nonGeomRas.append(input)
            inputs.extend(nonGeomRas)
            workflow["operations"][i]["inputs"] = inputs
            i = i + 1

        # Cleaning
        # Remove the numerics at the end of the operation and input identifiers
        # These numerics were added to make the names and identifiers unique
        i = 0
        for operation in workflow["operations"]:
            longname = extractNumericsfromString(operation["metadata"]["longname"])
            workflow["operations"][i]["metadata"]["longname"] = longname
            j = 0
            for input in operation["inputs"]:
                name = extractNumericsfromString(input["name"])
                identifier = extractNumericsfromString(input["identifier"])
                workflow["operations"][i]["inputs"][j]["name"] = name
                workflow["operations"][i]["inputs"][j]["identifier"] = identifier

                if "_to_" in str(input['value']):
                    workflow["operations"][i]["inputs"][j]["value"] = input['value'].split("_to_")[0]+"_to_"+str(j)
                j = j + 1
            i = i +1

        return json.dumps(workflows)
    def IlwisWorkflowToPIW(ilwisworkflow):
        jsonData = json.loads(ilwisworkflow)
        operations = jsonData['workflows'][0]['operations']
        connections = jsonData['workflows'][0]['connections']
        for connection in connections:
            value = str(connection["fromOperationID"])+"_to_"+str(connection["toParameterID"])
            index = WorkflowUtils.getOperationIndex(connection["toOperationID"],operations)
            jsonData['workflows'][0]['operations'][index]['inputs'][connection["toParameterID"]]["value"] = value
        i = 0
        for operation in operations:
            jsonData['workflows'][0]['operations'][i]["metadata"]["url"] = "QGIS"
            j = 0
            for input in operation['inputs']:
                jsonData['workflows'][0]['operations'][i]['inputs'][j]['identifier'] = jsonData['workflows'][0]['operations'][i]['inputs'][j]['name']
                if input['type'] == 'map' or input['type'] == 'coverage' or input['type'] == 'raster' or input['type'] == 'RasterCoverage':
                    jsonData['workflows'][0]['operations'][i]['inputs'][j]['type'] = 'coverage'
                elif input['type'] == 'feature' or input['type'] == 'table' or input['type'] == 'geometry' or input['type'] == 'PolygonCoverage':
                    jsonData['workflows'][0]['operations'][i]['inputs'][j]['type'] = 'geom'
                j = j + 1
            j = 0
            for output in operation['outputs']:
                if output['type'] == 'map' or output['type'] == 'coverage' or output['type'] == 'raster' or output['type'] == 'RasterCoverage':
                    jsonData['workflows'][0]['operations'][i]['outputs'][j]['type'] = 'coverage'

                elif output['type'] == 'feature' or output['type'] == 'table' or output['type'] == 'geometry' or output['type'] == 'PolygonCoverage':
                    jsonData['workflows'][0]['operations'][i]['outputs'][j]['type'] = 'geom'
                j = j + 1

            i = i + 1
        return json.dumps(jsonData)
    def pimToBPMN1(workflow):
        xml = dicttoxml(workflow, attr_type=False, custom_root="process")
        return str(xml, encoding='utf-8')

    def bpmnHead(self):
        root = Element('bpmn2:definitions')
        root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        root.set('xmlns:camunda', 'http://camunda.org/schema/1.0/bpmn')
        root.set('xmlns:bpmndi', 'http://www.omg.org/spec/BPMN/20100524/DI')
        root.set('xmlns:bpmn2', 'http://www.omg.org/spec/BPMN/20100524/MODEL')
        root.set('xmlns:dc', 'http://www.omg.org/spec/DD/20100524/DC')
        root.set('xmlns:di', 'http://www.omg.org/spec/DD/20100524/DI')
        root.set('xmlns:ext', 'http://org.eclipse.bpmn2/ext')
        root.set('xmlns:xs', 'http://www.w3.org/2001/XMLSchema')
        root.set('id', 'Definitions_1')
        root.set('exporter', 'org.eclipse.bpmn2.modeler.core')
        root.set('exporterVersion', '2018.2019_thesis')
        root.set('targetNamespace', 'http://org.eclipse.bpmn2/default/process')
        return root
    def pimToBPMN(workflow):
        root = WorkflowUtils.bpmnHead(WorkflowUtils)
        itemDefinition = SubElement(root, 'bpmn2:itemDefinition')
        itemDefinition.set("id", "ITEM_DEF_STRING")
        itemDefinition.set("isCollection", "false")
        itemDefinition.set("structureRef","xs:string")

        process = SubElement(root, 'bpmn2:process')
        process.set("id","_"+str(workflow["id"]))
        process.set("name",workflow["metadata"]["longname"])
        process.set("isExecutable", "true")

        sequenceFlow = SubElement(process, 'bpmn2:sequenceFlow')
        sequenceFlow.set("id", "SequenceFlow_Start")
        sequenceFlow.set("sourceRef", "StartEvent_1")
        sequenceFlow.set("targetRef", "ServiceTask_"+str(WorkflowUtils.getExecutionOrder(workflow)[0]) )
        i = 1
        for connection in workflow["connections"]:
            sequenceFlow = SubElement(process, 'bpmn2:sequenceFlow')
            sequenceFlow.set("id", "SequenceFlow_"+str(i))
            if i == 1:
                sequenceFlow.set("sourceRef", "ServiceTask_0")
            else:
                sequenceFlow.set("sourceRef", "ServiceTask_" + str(connection["fromOperationID"]))

            sequenceFlow.set("targetRef", "ServiceTask_" + str(connection["toOperationID"]))
            if i == len(workflow["connections"]):
                sequenceFlow = SubElement(process, 'bpmn2:sequenceFlow')
                sequenceFlow.set("id", "SequenceFlow_End")
                sequenceFlow.set("sourceRef", "ServiceTask_"+str(i))
                sequenceFlow.set("targetRef", "EndEvent_1")

            i = i + 1
        startEvent = SubElement(process, 'bpmn2:startEvent')
        startEvent.set("id", "StartEvent_1")
        startEvent.set("name", "Start Workflow")
        startEventOutgoing = SubElement(startEvent, 'bpmn2:outgoing')
        startEventOutgoing.text = "SequenceFlow_Start"

        endEvent = SubElement(process, 'bpmn2:endEvent')
        endEvent.set("id", "EndEvent_1")
        endEvent.set("name", "End Workflow")
        endEventIncoming = SubElement(endEvent, 'bpmn2:incoming')
        endEventIncoming.text = "SequenceFlow_End"

        operations = workflow["operations"]
        i = 1
        for id in WorkflowUtils.getExecutionOrder(workflow):
            operation = WorkflowUtils.getOperationByID(id, operations)
            task = SubElement(process, 'bpmn2:serviceTask')
            task.set("id", "ServiceTask_"+str(operation["id"]))
            task.set("name", operation["metadata"]["longname"])
            task.set("implementation", operation["metadata"]["url"])
            task.set("resource", operation["metadata"]["resource"])
            ioSpecification = SubElement(task, 'bpmn2:ioSpecification')
            ioSpecification.set("ioSpecification_","ioSpecification_"+str(id))

            inputSet = SubElement(ioSpecification, 'bpmn2:inputSet')

            for input in operation["inputs"]:
                dataInput = SubElement(ioSpecification, 'bpmn2:dataInput')
                dataInput.set("id", "DataInput_"+input["name"]+"_"+str(id))
                dataInput.set("itemSubjectRef", "ITEM_DEF_STRING")
                dataInput.set("name", input["name"])
                dataInput.set("type", input["type"])
                dataInput.set("optional", str(input["optional"]).lower())
                dataInput.set("value", input["value"])

                dataInputRefs = SubElement(inputSet, 'bpmn2:dataInputRefs')
                dataInputRefs.text = "DataInput_"+input["name"]+"_"+str(id)

                dataInputAssociation = SubElement(task, 'bpmn2:DataInputAssociation')
                dataInputAssociation.set("id", "DataInputAssociation_"+input["name"]+"_"+str(id))
                sourceRef = SubElement(dataInputAssociation, 'bpmn2:sourceRef')
                sourceRef.text = input["name"]
                targetRef = SubElement(dataInputAssociation, 'bpmn2:targetRef')
                targetRef.text = "DataInput_"+input["name"]+"_"+str(id)

            outputSet = SubElement(ioSpecification, 'bpmn2:outputSet')
            for output in operation["outputs"]:
                dataOutput = SubElement(ioSpecification, 'bpmn2:dataOutput')
                dataOutput.set("id", "DataOutput_"+output["name"]+"_"+str(id))
                dataOutput.set("itemSubjectRef", "ITEM_DEF_STRING")
                dataOutput.set("name", output["name"])
                dataOutput.set("type", output["type"])
                dataOutput.set("value", output["value"])

                dataOutputRefs = SubElement(outputSet, 'bpmn2:dataOutputRefs')
                dataOutputRefs.text = "DataOutput_"+output["name"]+"_"+str(id)

                dataOutputAssociation = SubElement(task, 'bpmn2:DataOutputAssociation')
                dataOutputAssociation.set("id", "DataOutputAssociation_" + output["name"]+"_"+str(id))
                sourceRef = SubElement(dataOutputAssociation, 'bpmn2:sourceRef')
                sourceRef.text = output["name"]
                targetRef = SubElement(dataOutputAssociation, 'bpmn2:targetRef')
                targetRef.text = "DataOutput_" + output["name"]+"_"+str(id)

            for connection in workflow["connections"]:
                if connection["fromOperationID"] == id:
                    outgoing = SubElement(task, 'bpmn2:outgoing')
                    outgoing.text = "SequenceFlow_" + str(connection["toOperationID"])

                if connection["toOperationID"] == id:
                    incoming = SubElement(task, 'bpmn2:incoming')
                    incoming.text = "SequenceFlow_" + str(connection["toOperationID"])

            if i == 1:
                incoming = SubElement(task, 'bpmn2:incoming')
                incoming.text = "SequenceFlow_Start"

            if i == len(WorkflowUtils.getExecutionOrder(workflow)):
                outgoing = SubElement(task, 'bpmn2:outgoing')
                outgoing.text = "SequenceFlow_End"

            i = i + 1

        diagram = SubElement(root, 'bpmndi:BPMNDiagram')
        diagram.set("id", "BPMNDiagram_"+str(workflow["id"]))
        plane = SubElement(diagram, 'bpmndi:BPMNPlane')
        plane.set("id", "BPMNPlane_ServiceTask_"+str(workflow["id"]))
        plane.set("bpmnElement", workflow["metadata"]["longname"])

        shape = SubElement(plane, 'bpmndi:BPMNShape')
        shape.set("id", "BPMNShape_StartEvent_1")
        shape.set("bpmnElement", "StartEvent_1")
        dc = SubElement(shape, 'dc:Bounds')
        dc.set("height", "36.0")
        dc.set("width", "36.0")
        operation = WorkflowUtils.getOperationByID(WorkflowUtils.getExecutionOrder(workflow)[0], operations)
        dc.set("x", "5.0")
        dc.set("y", str(operation["metadata"]["position"][1]+11))

        shape = SubElement(plane, 'bpmndi:BPMNShape')
        shape.set("id", "BPMNShape_EndEvent_1")
        shape.set("bpmnElement", "EndEvent_1")
        dc = SubElement(shape, 'dc:Bounds')
        dc.set("height", "36.0")
        dc.set("width", "36.0")
        print(WorkflowUtils.getExecutionOrder(workflow)[-1])
        operation = WorkflowUtils.getOperationByID(WorkflowUtils.getExecutionOrder(workflow)[-1], operations)
        dc.set("x", str(operation["metadata"]["position"][0]+36))
        dc.set("y", str(operation["metadata"]["position"][1]+110))

        i = 1
        for id in WorkflowUtils.getExecutionOrder(workflow):
            operation = WorkflowUtils.getOperationByID(id, operations)
            shape = SubElement(plane, 'bpmndi:BPMNShape')
            shape.set("id", "BPMNShape_ServiceTask_"+str(i))
            shape.set("bpmnElement", "ServiceTask_"+str(operation["id"]))
            dc = SubElement(shape, 'dc:Bounds')
            dc.set("height", "50.0")
            dc.set("width", "110.0")
            dc.set("x", str(operation["metadata"]["position"][0]))
            dc.set("y", str(operation["metadata"]["position"][1]))
            i = i + 1

        shape = SubElement(plane, 'bpmndi:BPMNEdge')
        shape.set("id", "BPMNEdge_SequenceFlow_1")
        shape.set("bpmnElement", "SequenceFlow_Start")
        di = SubElement(shape, 'di:waypoint')
        operation = WorkflowUtils.getOperationByID(WorkflowUtils.getExecutionOrder(workflow)[0], operations)
        di.set("x", "41.0")
        di.set("y", "36.0")
        di = SubElement(shape, 'di:waypoint')
        di.set("x", str(operation["metadata"]["position"][0]))
        di.set("y", str(operation["metadata"]["position"][1]+25))


        shape = SubElement(plane, 'bpmndi:BPMNEdge')
        shape.set("id", "BPMNEdge_SequenceFlow_2")
        shape.set("bpmnElement", "SequenceFlow_End")
        di = SubElement(shape, 'di:waypoint')
        operation = WorkflowUtils.getOperationByID(WorkflowUtils.getExecutionOrder(workflow)[-1], operations)
        di.set("x", str(operation["metadata"]["position"][0]+48))
        di.set("y", str(operation["metadata"]["position"][1]+50))
        di = SubElement(shape, 'di:waypoint')
        di.set("x", str(operation["metadata"]["position"][0]+48))
        di.set("y",str(operation["metadata"]["position"][1]+110))

        i = 3
        k = 1
        for connection in workflow["connections"]:
            operation = WorkflowUtils.getOperationByID(connection["fromOperationID"], operations)
            shape = SubElement(plane, 'bpmndi:BPMNEdge')
            shape.set("id", "BPMNEdge_SequenceFlow_" + str(i))
            shape.set("bpmnElement", "SequenceFlow_" + str(k))
            di = SubElement(shape, 'di:waypoint')
            di.set("x", str(operation["metadata"]["position"][0]+48))
            di.set("y", str(operation["metadata"]["position"][1]+50))
            di = SubElement(shape, 'di:waypoint')
            operation = WorkflowUtils.getOperationByID(connection["toOperationID"], operations)
            di.set("x", str(operation["metadata"]["position"][0]+48))
            di.set("y", str(operation["metadata"]["position"][1]))
            i = i + 1
            k = k + 1

        return '<?xml version="1.0" encoding="UTF-8" ?>'+str(tostring(root), encoding='utf-8')

    def drawDiagram(root, workflow):
        orderIDs = WorkflowUtils.getExecutionOrder(workflow)
        operations = workflow["operations"]
        connections = workflow["connections"]
        diagram = SubElement(root, 'bpmndi:BPMNDiagram')
        diagram.set("id", "BPMNDiagram_" + str(workflow["id"]))
        plane = SubElement(diagram, 'bpmndi:BPMNPlane')
        plane.set("id", "BPMNPlane_ServiceTask_" + str(workflow["id"]))
        plane.set("bpmnElement", workflow["metadata"]["longname"])

        shape = SubElement(plane, 'bpmndi:BPMNShape')
        shape.set("id", "BPMNShape_StartEvent_1")
        shape.set("bpmnElement", "StartEvent_1")
        dc = SubElement(shape, 'dc:Bounds')
        dc.set("height", "36.0")
        dc.set("width", "36.0")
        operation = WorkflowUtils.getOperationByID(orderIDs[0], operations)
        dc.set("x", "5.0")
        dc.set("y", str(operation["metadata"]["position"][1] + 11))

        shape = SubElement(plane, 'bpmndi:BPMNShape')
        shape.set("id", "BPMNShape_EndEvent_1")
        shape.set("bpmnElement", "EndEvent_1")
        dc = SubElement(shape, 'dc:Bounds')
        dc.set("height", "36.0")
        dc.set("width", "36.0")
        operation = WorkflowUtils.getOperationByID(orderIDs[-1], operations)
        dc.set("x", str(operation["metadata"]["position"][0] + 36))
        dc.set("y", str(operation["metadata"]["position"][1] + 110))

        i = 1
        for id in orderIDs:
            operation = WorkflowUtils.getOperationByID(id, operations)
            shape = SubElement(plane, 'bpmndi:BPMNShape')
            shape.set("id", "BPMNShape_ServiceTask_" + str(i))
            shape.set("bpmnElement", "ServiceTask_" + str(operation["id"]))
            dc = SubElement(shape, 'dc:Bounds')
            dc.set("height", "50.0")
            dc.set("width", "110.0")
            dc.set("x", str(operation["metadata"]["position"][0]))
            dc.set("y", str(operation["metadata"]["position"][1]))
            i = i + 1

        shape = SubElement(plane, 'bpmndi:BPMNEdge')
        shape.set("id", "BPMNEdge_SequenceFlow_1")
        shape.set("bpmnElement", "SequenceFlow_Start")
        di = SubElement(shape, 'di:waypoint')
        operation = WorkflowUtils.getOperationByID(orderIDs[0], operations)
        di.set("x", "41.0")
        di.set("y", "36.0")
        di = SubElement(shape, 'di:waypoint')
        di.set("x", str(operation["metadata"]["position"][0]))
        di.set("y", str(operation["metadata"]["position"][1] + 25))

        shape = SubElement(plane, 'bpmndi:BPMNEdge')
        shape.set("id", "BPMNEdge_SequenceFlow_2")
        shape.set("bpmnElement", "SequenceFlow_End")
        di = SubElement(shape, 'di:waypoint')
        operation = WorkflowUtils.getOperationByID(orderIDs[-1], operations)
        di.set("x", str(operation["metadata"]["position"][0] + 48))
        di.set("y", str(operation["metadata"]["position"][1] + 50))
        di = SubElement(shape, 'di:waypoint')
        di.set("x", str(operation["metadata"]["position"][0] + 48))
        di.set("y", str(operation["metadata"]["position"][1] + 110))

        i = 3
        k = 1
        for connection in workflow["connections"]:
            operation = WorkflowUtils.getOperationByID(connection["fromOperationID"], operations)
            shape = SubElement(plane, 'bpmndi:BPMNEdge')
            shape.set("id", "BPMNEdge_SequenceFlow_" + str(i))
            shape.set("bpmnElement", "SequenceFlow_" + str(k))
            di = SubElement(shape, 'di:waypoint')
            di.set("x", str(operation["metadata"]["position"][0] + 48))
            di.set("y", str(operation["metadata"]["position"][1] + 50))
            di = SubElement(shape, 'di:waypoint')
            operation = WorkflowUtils.getOperationByID(connection["toOperationID"], operations)
            di.set("x", str(operation["metadata"]["position"][0] + 48))
            di.set("y", str(operation["metadata"]["position"][1]))
            i = i + 1
            k = k + 1

    def pim2BPMN(workflow):
        orderIDs = WorkflowUtils.getExecutionOrder(workflow)
        operations = workflow["operations"]
        connections = workflow["connections"]
        root = WorkflowUtils.bpmnHead(WorkflowUtils)
        itemDefinition = SubElement(root, 'bpmn2:itemDefinition')
        itemDefinition.set("id", "ITEM_DEF_STRING")
        itemDefinition.set("isCollection", "false")
        itemDefinition.set("structureRef", "xs:string")

        process = SubElement(root, 'bpmn2:process')
        process.set("id", "process_id_" + str(workflow["id"]))
        process.set("name", workflow["metadata"]["longname"])
        process.set("isExecutable", "true")

        ioSpecification = SubElement(process, 'bpmn2:ioSpecification')
        for id in orderIDs:
            operation = WorkflowUtils.getOperationByID(id, operations)
            for input in operation["inputs"]:
                dataInput = SubElement(ioSpecification, 'bpmn2:dataInput')
                dataInput.set("id", "INPUT_" + str(id) + "_" + str(input["id"]))
                dataInput.set("itemSubjectRef", "ITEM_DEF_STRING")
                dataInput.set("name", input["name"])
                dataInput.set("description", input["description"])

        for id in orderIDs:
            operation = WorkflowUtils.getOperationByID(id, operations)
            for output in operation["outputs"]:
                dataOutput = SubElement(ioSpecification, 'bpmn2:dataOutput')
                dataOutput.set("id", "OUTPUT_" + str(id) + "_" + str(output["id"]))
                dataOutput.set("itemSubjectRef", "ITEM_DEF_STRING")
                dataOutput.set("name", output["name"])
                dataOutput.set("description", output["description"])

        startEvent = SubElement(process, 'bpmn2:startEvent')
        startEvent.set("id", "StartEvent_1")
        startEvent.set("name", "Start Workflow")
        startEventOutgoing = SubElement(startEvent, 'bpmn2:outgoing')
        startEventOutgoing.text = "SequenceFlow_Start"

        endEvent = SubElement(process, 'bpmn2:endEvent')
        endEvent.set("id", "EndEvent_1")
        endEvent.set("name", "End Workflow")
        endEventIncoming = SubElement(endEvent, 'bpmn2:incoming')
        endEventIncoming.text = "SequenceFlow_End"

        i = 1
        for id in orderIDs:
            operation = WorkflowUtils.getOperationByID(id, operations)
            task = SubElement(process, 'bpmn2:serviceTask')
            task.set("id", "ServiceTask_" + str(id))
            task.set("name", operation["metadata"]["longname"])
            task.set("implementation", operation["metadata"]["url"])
            task.set("resource", operation["metadata"]["resource"])
            if i == 1:
                incoming = SubElement(task, 'bpmn2:incoming')
                incoming.text = "SequenceFlow_Start"
            else:
                incoming = SubElement(task, 'bpmn2:incoming')
                incoming.text = "SequenceFlow_"+str(orderIDs[i-2])

            if i < len(orderIDs):
                outgoing = SubElement(task, 'bpmn2:outgoing')
                outgoing.text = "SequenceFlow_"+str(orderIDs[i])
            else:
                outgoing = SubElement(task, 'bpmn2:outgoing')
                outgoing.text = "SequenceFlow_End"

            ioSpecification = SubElement(task, 'bpmn2:ioSpecification')
            ioSpecification.set("id", "InputOutputSpecification_" + str(id))
            for input in operation["inputs"]:
                dataInput = SubElement(ioSpecification, 'bpmn2:dataInput')
                dataInput.set("id", "DataInput_INPUT_" + str(id) + "_" + str(input["id"]))
                dataInput.set("itemSubjectRef", "ITEM_DEF_STRING")
                dataInput.set("name", input["name"])
                dataInput.set("type", input["type"])
                dataInput.set("optional", str(input["optional"]).lower())
                dataInput.set("value", input["value"])
            for output in operation["outputs"]:
                dataOutput = SubElement(ioSpecification, 'bpmn2:dataOutput')
                dataOutput.set("id", "DataOutput_OUTPUT_" + str(id) + "_" + str(output["id"]))
                dataOutput.set("itemSubjectRef", "ITEM_DEF_STRING")
                dataOutput.set("name", output["name"])
                dataOutput.set("type", output["type"])
                dataOutput.set("value", output["value"])

            inputSet = SubElement(ioSpecification, 'bpmn2:inputSet')
            inputSet.set("name", "Input Set")
            for input in operation["inputs"]:
                dataInputRefs = SubElement(inputSet, 'bpmn2:dataInputRefs')
                dataInputRefs.text = "DataInput_INPUT_" + str(id) + "_" + str(input["id"])

            outputSet = SubElement(ioSpecification, 'bpmn2:outputSet')
            outputSet.set("name", "Output Set")
            for output in operation["outputs"]:
                dataOutputRefs = SubElement(outputSet, 'bpmn2:dataOutputRefs')
                dataOutputRefs.text = "DataOutput_OUTPUT_" + str(id) + "_" + str(output["id"])

            for input in operation["inputs"]:
                dataInputAssociation = SubElement(task, 'bpmn2:DataInputAssociation')
                dataInputAssociation.set("id", "DataInputAssociation_INPUT_" + str(id) + "_" + str(input["id"]))
                sourceRef = SubElement(dataInputAssociation, 'bpmn2:sourceRef')
                sourceRef.text = "INPUT_" + str(id) + "_" + str(input["id"])
                targetRef = SubElement(dataInputAssociation, 'bpmn2:targetRef')
                targetRef.text = "DataInput_INPUT_" + str(id) + "_" + str(input["id"])
                assignment = SubElement(dataInputAssociation, 'bpmn2:assignment')
                SubElement(assignment, 'bpmn2:from').text = input["value"]
                SubElement(assignment, 'bpmn2:to').text = "DataInput_INPUT_" + str(id) + "_" + str(input["id"])
            for output in operation["outputs"]:
                dataOutputAssociation = SubElement(task, 'bpmn2:DataOutputAssociation')
                dataOutputAssociation.set("id", "DataOutputAssociation_" + output["name"] + "_" + str(id))
                sourceRef = SubElement(dataOutputAssociation, 'bpmn2:sourceRef')
                sourceRef.text = "OUTPUT_" + str(id) + "_" + str(output["id"])
                targetRef = SubElement(dataOutputAssociation, 'bpmn2:targetRef')
                targetRef.text = "DataOutput_OUTPUT_" + str(id) + "_" + str(output["id"])

            sequenceFlow = SubElement(process, 'bpmn2:sequenceFlow')
            if i == 1:
                sequenceFlow.set("id", "SequenceFlow_Start")
                sequenceFlow.set("sourceRef", "StartEvent_1")
                sequenceFlow.set("targetRef", "ServiceTask_" + str(id))

                sequenceFlow = SubElement(process, 'bpmn2:sequenceFlow')
                sequenceFlow.set("id", "SequenceFlow_" + str(id))
                sequenceFlow.set("sourceRef", "ServiceTask_"+str(id))
                if i < len(orderIDs):
                    sequenceFlow.set("targetRef", "ServiceTask_" + str(orderIDs[i]))
                else:
                    sequenceFlow.set("targetRef", "EndEvent_1")
            else:
                if i < len(orderIDs):
                    sequenceFlow.set("id", "SequenceFlow_"+str(id))
                    sequenceFlow.set("sourceRef", "ServiceTask_"+str(orderIDs[i-2]))
                    sequenceFlow.set("targetRef", "ServiceTask_" + str(orderIDs[i]))
                else:
                    sequenceFlow.set("id", "SequenceFlow_End")
                    sequenceFlow.set("sourceRef", "ServiceTask_" +str(orderIDs[-1]))
                    sequenceFlow.set("targetRef", "EndEvent_1")
            i = i + 1

        WorkflowUtils.drawDiagram(root, workflow)
        return '<?xml version="1.0" encoding="UTF-8" ?>' + str(tostring(root), encoding='utf-8')



