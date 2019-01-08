from flask import Flask, request
import requests
from flask_restful import Resource, Api
import json
import os
from utils import Util as utils
from utils import WorkflowUtils as workflowUtils
app = Flask(__name__)
api = Api(app)
import socket

addr = socket.gethostbyname(socket.gethostname())

class BinaryMathRaster(Resource):
    def get(self, file1,file2, operator ):
        file1 = "http://"+file2.split("http://")[0]
        file1 = file1[:-1]
        file2 = "http://" + file2.split("http://")[1]
        result = utils.binaryMathRaster(file1, file2, operator)
        return result
class IlwisOperations(Resource):
    def get(self):
        return workflowUtils.getIlwisProcesses(self)
class IlwisExecute(Resource):
    def get(self, inputs, operation):
        inputs = str(inputs).split(";")
        paths = []
        texts = []
        for input in inputs:
            if "http://" in input:
                path = utils.downloadRasterFile(input)
                path = "file:///" + path["file"].replace("\\", "/")
                paths.append(path)
            else:
                texts.append(input)

        result = requests.post("http://127.0.0.1:2525", data=json.dumps({"files": paths, "texts": ",".join(texts), "operation": operation}))

        return json.loads(result.text)

class PublishRaster(Resource):
    def get(self, urls, inputs):
        file = urls.split(";")[0]
        base = os.path.basename(file)
        host = urls.split(";")[1]
        workspace = inputs.split(";")[0]
        projection = inputs.split(";")[1]
        username = inputs.split(";")[2]
        password = inputs.split(";")[3]
        style = os.path.splitext(base)[0]
        r = utils.generateSLD(file, os.path.splitext(base)[0])
        jarfilePath = "C:\GeoServerJavaApp\PublishStyle.jar"
        publishcommand = 'java -jar ' + jarfilePath + ' ' + r + ' ' + host + ' ' + workspace + ' ' + style + ' ' + username + ' ' + password
        os.system(publishcommand)
        style = workspace + ":" + style
        os.remove(r)

        jarfilePath = "C:\GeoServerJavaApp\PublishRaster.jar"
        publishcommand = 'java -jar '+jarfilePath+' '+ file + ' ' + host + ' ' + workspace + ' ' + style + ' ' + username + ' ' +password+ ' '+projection
        os.system(publishcommand)
        extent = utils.getExtent(file)
        return {"extent": extent, "layer": workspace+":"+os.path.splitext(base)[0]}

class ExecuteWorkflow(Resource):
    def post(self):
        json_data = request.get_json(force=True)
        #jsonData = json.loads(workflow)
        output = workflowUtils.executeOperation(json_data["workflows"])
        results = []
        for output in output:
            results.append({
                "id": output["id"],
                "result": json.loads(output["data"]),
                "type": output["type"]
            })
        return results

class QgisToIlwis(Resource):
    def post(self):
        json_data = request.get_json(force=True)
        piw = workflowUtils.QgisWorkflowToPIW(json.dumps(json_data))
        #qgis = workflowUtils.piwToIlwisWorkflow(piw)
        return json.loads(piw)

class IlwisToQgis(Resource):
    def post(self):
        json_data = request.get_json(force=True)
        piw = workflowUtils.IlwisWorkflowToPIW(json.dumps(json_data))
        qgis = workflowUtils.piwToQgisWorkflow(piw)
        return json.loads(qgis)

class CoordTransformGeoJSON(Resource):
    def post(self):
        json_data = request.get_json(force=True)
        geojsonData = json_data["data"]
        fromSRID = json_data["fromSRID"]
        toSRID = json_data["toSRID"]
        result = utils.coordinateTransformGeoJSON(geojsonData, fromSRID, toSRID)
        return json.loads(result)





api.add_resource(BinaryMathRaster, '/binarymathraster/<path:file1>/<path:file2>/<string:operator>')  # Route_1

api.add_resource(IlwisOperations, '/ilwisoperations')  # Route_2

api.add_resource(IlwisExecute, '/ilwisoperations/execute/<path:inputs>/<operation>')  # Route_3

api.add_resource(PublishRaster, '/publish/raster/<path:urls>/<inputs>')  # Route_4

api.add_resource(ExecuteWorkflow, '/workflow/execute')  # Route_5

api.add_resource(IlwisToQgis, '/transform/fromilwistoqgis')  # Route_6

api.add_resource(QgisToIlwis, '/transform/fromqgistoilwis')  # Route_7

api.add_resource(CoordTransformGeoJSON, '/transformcoords')  # Route_8
if __name__ == '__main__':
    app.run(host="127.0.0.1",port='75')