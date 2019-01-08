#!C:/Users/Bob/AppData/Local/Programs/Python/Python36/python

import os
import struct
import glob
import numpy as np
import math
import json
import cgi

def ReadLong(ifile, bytes):
    items = bytes // 4
    buffer = ifile.read(bytes)
    vals = struct.unpack('<' + str(items) + 'i', buffer)
    return vals

def ReadShort(ifile, bytes):
    items = bytes // 2
    buffer = ifile.read(bytes)
    vals = struct.unpack('<' + str(items) + 'h', buffer)
    return vals

def readIlwisFileLong(filename):
    bytes = os.stat(filename).st_size
    f = open(filename, 'rb')
    vals = ReadLong(f, bytes)
    return vals

def readIlwisFileShort(filename):
    bytes = os.stat(filename).st_size
    f = open(filename, 'rb')
    vals = ReadShort(f, bytes)
    return vals

def getGeoref():
    georef=dict()
    georef['ysize']=11
    georef['xsize']=11
    georef['MaxX']=-2.754450
    georef['MaxY']=11.500000
    georef['MinX']=-3.250000
    georef['MinY']=11.004450
    return georef

def getPixel(lat, lon, georef):
    x = int(georef['xsize'] * (lon - georef['MinX']) / (georef['MaxX'] - georef['MinX']))
    y = int(georef['ysize'] * (lat - georef['MinY']) / (georef['MaxY'] - georef['MinY']))
    pixel = dict()
    pixel['x'] = x
    pixel['y'] = y
    return pixel
    
def getPixelValue(lat, lon, vals, georef):
    pixel = getPixel(lat, lon, georef)
    return vals[pixel['y'] * georef['xsize'] + pixel['x']] / 10.0

def readLocationsWascal(locationfile):
    locations = []
    f = open(locationfile, 'r')
    header = f.readline()
    line = f.readline()    
    while(line != ''):
        elems = line.split(',')
        label = elems[1].title()
        lat = float(elems[2])
        lon = float(elems[3])
        elev = float(elems[4])
        locations.append((label, lat, lon, elev))
        line = f.readline()
    return locations

def readLocations(locationfile):
    locations = []
    f = open(locationfile, 'r')
    header = f.readline()
    line = f.readline()    
    while(line != ''):
        elems = line.split(',')
        label = elems[0]
        lon = float(elems[1])
        lat = float(elems[2])
        locations.append((label, lat, lon))
        line = f.readline()
    return locations

def crossWithCSV(locations, csvfile, start, end):
    matrix = dict()
    f = open(csvfile, 'r')
    header = f.readline()
    header = header.split(',')
    names = f.readline()
    names = names.split(',')
    index = 0
    line = f.readline()
    while(line != ''):
        index = index + 1
        if start != -1:
            if index < start:
                line = f.readline()
                continue
        if end != -1:
            if index > end:
                break
        elems = line.split(',')
        for i in range(0, len(header)):
            label = header[i].strip().strip('"')
            if label != '' and label in [l[0] for l in locations]:
                value = float(elems[i])
                if not label in matrix:
                    matrix[label] = []
                matrix[label].append(value)
        line = f.readline()
    for i in range(0, len(header)):
        label = header[i].strip().strip('"')
        if label != '':
            name = names[i].strip().strip('"')
            for j in range(0, len(locations)):
                if label in locations[j][0]:
                    locations[j] += (name,) # tuple append
                    break
    return matrix

def crossWithMaplist(locations, maplistpattern, georef, long, start, end):
    matrix = dict()
    files = sorted(glob.glob(maplistpattern))
    index = 0
    for file in files:
        index = index + 1
        if start != -1:
            if index < start:
                continue
        if end != -1:
            if index > end:
                break
        if long:
            vals = readIlwisFileLong(file)
        else:
            vals = readIlwisFileShort(file)        
        for location in locations:
            label = location[0]
            lat = location[1]
            lon = location[2]
            value = getPixelValue(lat, lon, vals, georef)
            if not label in matrix:
                matrix[label] = []
            matrix[label].append(value)        
    return matrix

def makeTriplets(label, m1, m2, m3):
    return np.matrix([m1[label], m2[label], m3[label]])

def translateRanks(ranks):
    result = []
    for rank in ranks:
        if rank == 0:
            result.append('Citizen')
        elif rank == 1:
            result.append('InSitu')
        elif rank == 2:
            result.append('Satellite')
    return result

def computeLocationData():
    params = cgi.FieldStorage()
    start = int(params.getvalue('start', -1))
    end = int(params.getvalue('end', -1))
    locationdata = []
    georef = getGeoref()
    locations_wascal = readLocationsWascal('data/loc_wascal_meteo.txt')
    locations = readLocations('data/WPDx_locs_Dano.csv')
    #citizenMatrix = crossWithCSV(locations, 'data/cit_testjuly2015.csv')
    citizenMatrix = crossWithCSV(locations, 'data/cit_testjuly2015_2withnames.csv', start, end)
    satelliteMatrix = crossWithMaplist(locations, 'data/P1507??.mp#', georef, True, start, end)
    stationMatrix = crossWithMaplist(locations, 'data/Wascal_meteo_july2015_V*.mp#', georef, False, start, end)
    for location in locations:
        label = location[0]
        lat = location[1]
        lon = location[2]
        name = location[3]
        triplets = makeTriplets(label, citizenMatrix, stationMatrix, satelliteMatrix)
        Qhat = np.cov(triplets)
        w1 = math.sqrt((Qhat[0,1]*Qhat[0,2])/(Qhat[0,0]*Qhat[1,2]))
        w2 = np.sign(Qhat[0,2]*Qhat[1,2])*math.sqrt((Qhat[0,1]*Qhat[1,2])/(Qhat[1,1]*Qhat[0,2]))
        w3 = np.sign(Qhat[0,1]*Qhat[1,2])*math.sqrt((Qhat[0,2]*Qhat[1,2])/(Qhat[2,2]*Qhat[0,1]))
        rho = np.array([w1,w2,w3])
        ranks = np.argsort(rho)[::-1] # [::-1] for reversing the result
        rhosquare = np.square(rho)
        rhoeight = np.square(rhosquare)
        rhoeight = np.square(rhoeight)
        e1 = (Qhat[0,0]-Qhat[0,1]*Qhat[0,2]/Qhat[1,2])
        e2 = (Qhat[1,1]-Qhat[0,1]*Qhat[1,2]/Qhat[0,2])
        e3 = (Qhat[2,2]-Qhat[0,2]*Qhat[1,2]/Qhat[0,1])
        errVar = np.array([e1,e2,e3])
        #print(label + ': w1=' + str(w1) + ' w2=' + str(w2) + ' w3=' + str(w3))
        #print('     ranks: ' + str(ranks))    
        #print('     rhosquare: ' + str(rhosquare))
        #print('     errVar: ' + str(errVar))
        locationdata.append({'type': 'Feature',
                             'geometry': {
                                'type': 'Point',
                                'coordinates': [lon,lat]
                             },
                             'properties': {
                                'label': label,
                                'name': name,
                                'w1': w1,
                                'w2': w2,
                                'w3': w3,
                                'ranks': translateRanks(ranks.tolist()),
                                'rhosquare': rhosquare.tolist(),
                                'rhoeight': rhoeight.tolist(),
                                'errVar': errVar.tolist()
                             }
                            })
    locationdata = {'type': 'FeatureCollection',
                    'features': locationdata}
    wascal_locationdata = []
    for location in locations_wascal:
        label = location[0]
        lat = location[1]
        lon = location[2]
        elevation = location[3]
        wascal_locationdata.append({'type': 'Feature',
                                    'geometry': {
                                       'type': 'Point',
                                       'coordinates': [lon,lat]
                                    },
                                    'properties': {
                                        'label': label,
                                        'elevation': elevation
                                    }
                                   })
    wascal_locationdata = {'type': 'FeatureCollection',
                    'features': wascal_locationdata}
    return [locationdata, wascal_locationdata]

# main()
d = computeLocationData()
print ("Content-type: application/json")
print ()
print(json.dumps(d))