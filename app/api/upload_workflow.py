#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python
import json
import cgi
from utils import WorkflowUtils as utils

print("Content-type: application/json")
print()

params = cgi.FieldStorage()
workflowText = params.getvalue('workflow')
package = params.getvalue("package")

if workflowText is None:
    workflowText = """
    {
    "values": {
        "inputs": {
            "raster2": {
                "values": {
                    "pos": {
                        "values": {
                            "y": 125.0, 
                            "x": 428.0
                        }, 
                        "class": "point"
                    }, 
                    "param": {
                        "values": {
                            "isAdvanced": false, 
                            "name": "raster2", 
                            "showSublayersDialog": true, 
                            "default": null, 
                            "value": null, 
                            "exported": null, 
                            "hidden": false, 
                            "optional": false, 
                            "description": "raster2"
                        }, 
                        "class": "processing.core.parameters.ParameterRaster"
                    }
                }, 
                "class": "processing.modeler.ModelerAlgorithm.ModelerParameter"
            }, 
            "raster": {
                "values": {
                    "pos": {
                        "values": {
                            "y": 114.0, 
                            "x": 136.0
                        }, 
                        "class": "point"
                    }, 
                    "param": {
                        "values": {
                            "isAdvanced": false, 
                            "name": "raster", 
                            "showSublayersDialog": true, 
                            "default": null, 
                            "value": null, 
                            "exported": null, 
                            "hidden": false, 
                            "optional": false, 
                            "description": "raster"
                        }, 
                        "class": "processing.core.parameters.ParameterRaster"
                    }
                }, 
                "class": "processing.modeler.ModelerAlgorithm.ModelerParameter"
            }
        }, 
        "helpContent": {}, 
        "group": "bb", 
        "name": "bb", 
        "algs": {
            "SAGARASTERCALCULATOR_1": {
                "values": {
                    "name": "SAGARASTERCALCULATOR_1", 
                    "paramsFolded": true, 
                    "outputs": {}, 
                    "outputsFolded": true, 
                    "pos": {
                        "values": {
                            "y": 268.0, 
                            "x": 376.0
                        }, 
                        "class": "point"
                    }, 
                    "dependencies": [], 
                    "params": {
                        "GRIDS": {
                            "values": {
                                "name": "raster2"
                            }, 
                            "class": "processing.modeler.ModelerAlgorithm.ValueFromInput"
                        }, 
                        "USE_NODATA": false, 
                        "RESAMPLING": 3, 
                        "FORMULA": "@1+@2", 
                        "TYPE": 7, 
                        "XGRIDS": [
                            {
                                "values": {
                                    "name": "raster2"
                                }, 
                                "class": "processing.modeler.ModelerAlgorithm.ValueFromInput"
                            }, 
                            {
                                "values": {
                                    "name": "raster"
                                }, 
                                "class": "processing.modeler.ModelerAlgorithm.ValueFromInput"
                            }
                        ]
                    }, 
                    "active": true, 
                    "consoleName": "saga:rastercalculator", 
                    "description": "Raster calculator"
                }, 
                "class": "processing.modeler.ModelerAlgorithm.Algorithm"
            }
        }
    }, 
    "class": "processing.modeler.ModelerAlgorithm.ModelerAlgorithm"
}"""

workflowJSON = json.loads(workflowText)

if package is None:
    package = 'QGIS'
if package == "ILWIS":
    result = utils.IlwisWorkflowToPIW(workflowText)
    print(result)
elif package == "QGIS":
    result = utils.QgisWorkflowToPIW(workflowText)
    print(result)
else:
    print(workflowText)
