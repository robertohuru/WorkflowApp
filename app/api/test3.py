#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python
import json
from utils import WorkflowUtils as wutils
workflow = """
{
  "workflows": [
    {
      "id": 1,
      "metadata": {
        "longname": "MAMASE Workflow"
      },
      "operations": [
        {
          "id": 0,
          "metadata": {
            "longname": "AggregateRainfall",
            "label": "AggregateRainfall",
            "url": "http://130.89.8.26/aggregaterainfall",
            "resource": "REST",
            "description": "Returns an aggregate of rainfall within the specified period.",
            "inputparametercount": 3,
            "outputparametercount": 1,
            "position": [
              272,
              7
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "Start date",
              "name": "Start date",
              "type": "date",
              "description": "The start date of the period",
              "optional": false,
              "url": "",
              "value": "2017-12-31T23:00:00.000Z"
            },
            {
              "id": 1,
              "identifier": "End date",
              "name": "End date",
              "type": "date",
              "description": "The end date of the period",
              "optional": false,
              "url": "",
              "value": "2018-12-05T11:29:25.468Z"
            },
            {
              "id": 2,
              "identifier": "operator(sum/average)",
              "name": "operator(sum/average)",
              "type": "text",
              "description": "Aggregation operator",
              "optional": false,
              "url": "",
              "value": "sum"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "identifier": "result",
              "name": "result",
              "value": "",
              "type": "coverage",
              "description": "result"
            }
          ]
        },
        {
          "id": 1,
          "metadata": {
            "longname": "production.ilwis",
            "label": "production.ilwis",
            "url": "http://130.89.8.26/ilwisoperations",
            "resource": "ILWIS",
            "description": "production",
            "inputparametercount": 4,
            "outputparametercount": 1,
            "position": [
              429,
              260
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "Rainfall map (mm)",
              "name": "Rainfall map (mm)",
              "type": "coverage",
              "description": "The object will opened and is available in the workflow",
              "optional": false,
              "url": "",
              "value": "0_to_0"
            },
            {
              "id": 1,
              "identifier": "Rainfall Factor",
              "name": "Rainfall Factor",
              "type": "String",
              "description": "Value of the variable",
              "optional": false,
              "url": "",
              "value": "1"
            },
            {
              "id": 2,
              "identifier": "proper use factor",
              "name": "proper use factor",
              "type": "String",
              "description": "Value of the variable",
              "optional": false,
              "url": "",
              "value": "0.8"
            },
            {
              "id": 3,
              "identifier": "type P_factor or P_na",
              "name": "type P_factor or P_na",
              "type": "String",
              "description": "Value of the variable",
              "optional": false,
              "url": "",
              "value": "P_na"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "value": "",
              "name": "raster coverage",
              "identifier": "raster coverage",
              "description": "",
              "type": "coverage"
            }
          ]
        },
        {
          "id": 2,
          "metadata": {
            "longname": "Demand",
            "label": "Demand",
            "url": "http://130.89.8.26/demand",
            "resource": "REST",
            "description": "Returns the biomass demand for the specified period.",
            "inputparametercount": 2,
            "outputparametercount": 1,
            "position": [
              725,
              269
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "Start date",
              "name": "Start date",
              "type": "date",
              "description": "The start date of the period",
              "optional": false,
              "url": "",
              "value": "2017-12-31T23:00:00.000Z"
            },
            {
              "id": 1,
              "identifier": "End date",
              "name": "End date",
              "type": "date",
              "description": "The end date of the period",
              "optional": false,
              "url": "",
              "value": "2018-12-05T11:31:48.251Z"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "identifier": "result",
              "name": "result",
              "value": "",
              "type": "coverage",
              "description": "result"
            }
          ]
        },
        {
          "id": 3,
          "metadata": {
            "longname": "BinaryMathRaster",
            "label": "BinaryMathRaster",
            "url": "http://130.89.221.193:75/binarymathraster",
            "resource": "REST",
            "description": "Returns a raster generated by pixel-by-pixel addition of two source rasters.  Source rasters must have the same bounding box and resolution.",
            "inputparametercount": 3,
            "outputparametercount": 1,
            "position": [
              654,
              448
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "CoverageA",
              "name": "CoverageA",
              "type": "coverage",
              "description": "First input coverage",
              "optional": false,
              "url": "",
              "value": "1_to_0"
            },
            {
              "id": 1,
              "identifier": "CoverageB",
              "name": "CoverageB",
              "type": "coverage",
              "description": "Second input coverage",
              "optional": false,
              "url": "",
              "value": "2_to_1"
            },
            {
              "id": 2,
              "identifier": "operator",
              "name": "operator",
              "type": "text",
              "description": "Operator to be applied to rasters",
              "optional": false,
              "url": "",
              "value": "minus"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "identifier": "result",
              "name": "result",
              "value": "",
              "type": "coverage",
              "description": "result"
            }
          ]
        },
        {
          "id": 4,
          "metadata": {
            "longname": "resample",
            "label": "resample",
            "url": "http://130.89.8.26/ilwisoperations",
            "resource": "ILWIS",
            "description": "Resample Raster",
            "inputparametercount": 3,
            "outputparametercount": 1,
            "position": [
              657,
              664
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "input rastercoverage",
              "name": "input rastercoverage",
              "type": "coverage",
              "description": "input rastercoverage with domain any domain",
              "optional": false,
              "url": "",
              "value": "3_to_0"
            },
            {
              "id": 1,
              "identifier": "target georeference",
              "name": "target georeference",
              "type": "Georeference",
              "description": "the georeference to which the input coverage will be morphed",
              "optional": false,
              "url": "",
              "value": "mamase_utm"
            },
            {
              "id": 2,
              "identifier": "Resampling method",
              "name": "Resampling method",
              "type": "String",
              "description": "The method used to aggregate pixels from the input map in the geometry of the output map",
              "optional": false,
              "url": "",
              "value": "bicubic"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "value": "",
              "name": "output rastercoverage",
              "identifier": "output rastercoverage",
              "description": "output rastercoverage with the domain of the input map",
              "type": "coverage"
            }
          ]
        },
        {
          "id": 5,
          "metadata": {
            "longname": "PublishRaster",
            "label": "PublishRaster",
            "url": "http://130.89.221.193:75/publish/raster",
            "resource": "GeoServer",
            "description": "This operation publishes a raster map to the specified geoserver. It returns the namespace of the published map",
            "inputparametercount": 5,
            "outputparametercount": 1,
            "position": [
              658,
              856
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "Input coverage",
              "name": "Input coverage",
              "type": "coverage",
              "description": "Input coverage",
              "optional": false,
              "url": "",
              "value": "4_to_0"
            },
            {
              "id": 1,
              "identifier": "GeoServer Url",
              "name": "GeoServer Url",
              "type": "text",
              "description": "Url for the Geoserver",
              "optional": false,
              "url": "http://130.89.221.193:85/geoserver",
              "value": "http://130.89.221.193:85/geoserver"
            },
            {
              "id": 2,
              "identifier": "workspace",
              "name": "workspace",
              "type": "text",
              "description": "The geoserver workspace",
              "optional": true,
              "url": "",
              "value": "thesis_test"
            },
            {
              "id": 3,
              "identifier": "username",
              "name": "username",
              "type": "text",
              "description": "The geoserver admin username",
              "optional": false,
              "url": "",
              "value": "admin"
            },
            {
              "id": 4,
              "identifier": "password",
              "name": "password",
              "type": "text",
              "description": "The geoserver admin password",
              "optional": false,
              "url": "",
              "value": "maris_mamase"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "identifier": "result",
              "name": "result",
              "value": "",
              "type": "geoserver",
              "description": "result"
            }
          ]
        },
        {
          "id": 6,
          "metadata": {
            "longname": "resample",
            "label": "resample",
            "url": "http://130.89.8.26/ilwisoperations",
            "resource": "ILWIS",
            "description": "Resample Raster",
            "inputparametercount": 3,
            "outputparametercount": 1,
            "position": [
              134,
              247
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "input rastercoverage",
              "name": "input rastercoverage",
              "type": "coverage",
              "description": "input rastercoverage with domain any domain",
              "optional": false,
              "url": "",
              "value": "0_to_0"
            },
            {
              "id": 1,
              "identifier": "target georeference",
              "name": "target georeference",
              "type": "Georeference",
              "description": "the georeference to which the input coverage will be morphed",
              "optional": false,
              "url": "",
              "value": "mamase_utm"
            },
            {
              "id": 2,
              "identifier": "Resampling method",
              "name": "Resampling method",
              "type": "String",
              "description": "The method used to aggregate pixels from the input map in the geometry of the output map",
              "optional": false,
              "url": "",
              "value": "bicubic"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "value": "",
              "name": "output rastercoverage",
              "identifier": "output rastercoverage",
              "description": "output rastercoverage with the domain of the input map",
              "type": "coverage"
            }
          ]
        },
        {
          "id": 7,
          "metadata": {
            "longname": "PublishRaster",
            "label": "PublishRaster",
            "url": "http://130.89.221.193:75/publish/raster",
            "resource": "GeoServer",
            "description": "This operation publishes a raster map to the specified geoserver. It returns the namespace of the published map",
            "inputparametercount": 5,
            "outputparametercount": 1,
            "position": [
              134,
              431
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "Input coverage",
              "name": "Input coverage",
              "type": "coverage",
              "description": "Input coverage",
              "optional": false,
              "url": "",
              "value": "6_to_0"
            },
            {
              "id": 1,
              "identifier": "GeoServer Url",
              "name": "GeoServer Url",
              "type": "text",
              "description": "Url for the Geoserver",
              "optional": false,
              "url": "http://130.89.221.193:85/geoserver",
              "value": "http://130.89.221.193:85/geoserver"
            },
            {
              "id": 2,
              "identifier": "workspace",
              "name": "workspace",
              "type": "text",
              "description": "The geoserver workspace",
              "optional": true,
              "url": "",
              "value": "thesis_test"
            },
            {
              "id": 3,
              "identifier": "username",
              "name": "username",
              "type": "text",
              "description": "The geoserver admin username",
              "optional": false,
              "url": "",
              "value": "admin"
            },
            {
              "id": 4,
              "identifier": "password",
              "name": "password",
              "type": "text",
              "description": "The geoserver admin password",
              "optional": false,
              "url": "",
              "value": "maris_mamase"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "identifier": "result",
              "name": "result",
              "value": "",
              "type": "geoserver",
              "description": "result"
            }
          ]
        },
        {
          "id": 8,
          "metadata": {
            "longname": "resample",
            "label": "resample",
            "url": "http://130.89.8.26/ilwisoperations",
            "resource": "ILWIS",
            "description": "Resample Raster",
            "inputparametercount": 3,
            "outputparametercount": 1,
            "position": [
              392,
              479
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "input rastercoverage",
              "name": "input rastercoverage",
              "type": "coverage",
              "description": "input rastercoverage with domain any domain",
              "optional": false,
              "url": "",
              "value": "1_to_0"
            },
            {
              "id": 1,
              "identifier": "target georeference",
              "name": "target georeference",
              "type": "Georeference",
              "description": "the georeference to which the input coverage will be morphed",
              "optional": false,
              "url": "",
              "value": "mamase_utm"
            },
            {
              "id": 2,
              "identifier": "Resampling method",
              "name": "Resampling method",
              "type": "String",
              "description": "The method used to aggregate pixels from the input map in the geometry of the output map",
              "optional": false,
              "url": "",
              "value": "bicubic"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "value": "",
              "name": "output rastercoverage",
              "identifier": "output rastercoverage",
              "description": "output rastercoverage with the domain of the input map",
              "type": "coverage"
            }
          ]
        },
        {
          "id": 9,
          "metadata": {
            "longname": "PublishRaster",
            "label": "PublishRaster",
            "url": "http://130.89.221.193:75/publish/raster",
            "resource": "GeoServer",
            "description": "This operation publishes a raster map to the specified geoserver. It returns the namespace of the published map",
            "inputparametercount": 5,
            "outputparametercount": 1,
            "position": [
              391,
              669
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "Input coverage",
              "name": "Input coverage",
              "type": "coverage",
              "description": "Input coverage",
              "optional": false,
              "url": "",
              "value": "8_to_0"
            },
            {
              "id": 1,
              "identifier": "GeoServer Url",
              "name": "GeoServer Url",
              "type": "text",
              "description": "Url for the Geoserver",
              "optional": false,
              "url": "http://130.89.221.193:85/geoserver",
              "value": "http://130.89.221.193:85/geoserver"
            },
            {
              "id": 2,
              "identifier": "workspace",
              "name": "workspace",
              "type": "text",
              "description": "The geoserver workspace",
              "optional": true,
              "url": "",
              "value": "thesis_test"
            },
            {
              "id": 3,
              "identifier": "username",
              "name": "username",
              "type": "text",
              "description": "The geoserver admin username",
              "optional": false,
              "url": "",
              "value": "admin"
            },
            {
              "id": 4,
              "identifier": "password",
              "name": "password",
              "type": "text",
              "description": "The geoserver admin password",
              "optional": false,
              "url": "",
              "value": "maris_mamase"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "identifier": "result",
              "name": "result",
              "value": "",
              "type": "geoserver",
              "description": "result"
            }
          ]
        },
        {
          "id": 10,
          "metadata": {
            "longname": "resample",
            "label": "resample",
            "url": "http://130.89.8.26/ilwisoperations",
            "resource": "ILWIS",
            "description": "Resample Raster",
            "inputparametercount": 3,
            "outputparametercount": 1,
            "position": [
              917,
              449
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "input rastercoverage",
              "name": "input rastercoverage",
              "type": "coverage",
              "description": "input rastercoverage with domain any domain",
              "optional": false,
              "url": "",
              "value": "2_to_0"
            },
            {
              "id": 1,
              "identifier": "target georeference",
              "name": "target georeference",
              "type": "Georeference",
              "description": "the georeference to which the input coverage will be morphed",
              "optional": false,
              "url": "",
              "value": "mamase_utm"
            },
            {
              "id": 2,
              "identifier": "Resampling method",
              "name": "Resampling method",
              "type": "String",
              "description": "The method used to aggregate pixels from the input map in the geometry of the output map",
              "optional": false,
              "url": "",
              "value": "bicubic"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "value": "",
              "name": "output rastercoverage",
              "identifier": "output rastercoverage",
              "description": "output rastercoverage with the domain of the input map",
              "type": "coverage"
            }
          ]
        },
        {
          "id": 11,
          "metadata": {
            "longname": "PublishRaster",
            "label": "PublishRaster",
            "url": "http://130.89.221.193:75/publish/raster",
            "resource": "GeoServer",
            "description": "This operation publishes a raster map to the specified geoserver. It returns the namespace of the published map",
            "inputparametercount": 5,
            "outputparametercount": 1,
            "position": [
              924,
              665
            ]
          },
          "inputs": [
            {
              "id": 0,
              "identifier": "Input coverage",
              "name": "Input coverage",
              "type": "coverage",
              "description": "Input coverage",
              "optional": false,
              "url": "",
              "value": "10_to_0"
            },
            {
              "id": 1,
              "identifier": "GeoServer Url",
              "name": "GeoServer Url",
              "type": "text",
              "description": "Url for the Geoserver",
              "optional": false,
              "url": "http://130.89.221.193:85/geoserver",
              "value": "http://130.89.221.193:85/geoserver"
            },
            {
              "id": 2,
              "identifier": "workspace",
              "name": "workspace",
              "type": "text",
              "description": "The geoserver workspace",
              "optional": true,
              "url": "",
              "value": "thesis_test"
            },
            {
              "id": 3,
              "identifier": "username",
              "name": "username",
              "type": "text",
              "description": "The geoserver admin username",
              "optional": false,
              "url": "",
              "value": "admin"
            },
            {
              "id": 4,
              "identifier": "password",
              "name": "password",
              "type": "text",
              "description": "The geoserver admin password",
              "optional": false,
              "url": "",
              "value": "maris_mamase"
            }
          ],
          "outputs": [
            {
              "id": 0,
              "identifier": "result",
              "name": "result",
              "value": "",
              "type": "geoserver",
              "description": "result"
            }
          ]
        }
      ],
      "connections": [
        {
          "fromOperationID": 0,
          "toOperationID": 1,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 1,
          "toOperationID": 3,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 2,
          "toOperationID": 3,
          "fromParameterID": 0,
          "toParameterID": 1
        },
        {
          "fromOperationID": 3,
          "toOperationID": 4,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 4,
          "toOperationID": 5,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 0,
          "toOperationID": 6,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 6,
          "toOperationID": 7,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 1,
          "toOperationID": 8,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 8,
          "toOperationID": 9,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 2,
          "toOperationID": 10,
          "fromParameterID": 0,
          "toParameterID": 0
        },
        {
          "fromOperationID": 10,
          "toOperationID": 11,
          "fromParameterID": 0,
          "toParameterID": 0
        }
      ]
    }
  ]
}
"""

workflow = json.loads(workflow)
r = wutils.pimToBPMN(workflow["workflows"][0])


print(r)

#r = wutils.pimToBPMN1(workflow["workflows"][0])
#print(r)