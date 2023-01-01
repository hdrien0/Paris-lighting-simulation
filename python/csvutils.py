import csv
import json
import os
from os.path import exists
from shapely.geometry import shape
import geopandas as gdp
from haversine import haversine, Unit
import requests
from classes import *

# DBLIST = ["eclairage-public","plan-de-voirie-chaussees","volumesbatisparis"]
baseDir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(baseDir)

def getCoordinatesFromStreetName(street):
    result = json.loads(requests.get(url="https://nominatim.openstreetmap.org/search",params={'q': street+", Paris",'format': 'json'}).text)[0]
    return float(result["lat"]),float(result["lon"])

def extractStreetFromCSV(filename,street,dist):
    tempPath=os.path.join(baseDir,"temp")
    if not os.path.isdir(tempPath):
        os.makedirs(tempPath)
    streetCSVPath = os.path.join(tempPath,"{} {} ({}m).csv".format(filename,street,dist))
    if exists(streetCSVPath):
        return streetCSVPath
    coords = getCoordinatesFromStreetName(street)
    newCSV = []
    fieldnames = None
    with open(os.path.join(baseDir,"DB/"+filename+".csv"),encoding="utf-8") as inputCsv:
        reader = csv.DictReader(inputCsv,delimiter=';')
        fieldnames = reader.fieldnames
        if not filename=="volumesbatisparis":
            newCSV = [row for row in reader if row["geo_point_2d"]!="" and haversine(coords,[float(coord) for coord in row["geo_point_2d"].split(",")],unit=Unit.METERS)<dist]
        else:
            newCSV = [row for row in reader if row["geom_x_y"]!="" and haversine(coords,[float(coord) for coord in row["geom_x_y"].split(",")],unit=Unit.METERS)<dist]

    with open(streetCSVPath, 'w', newline='',encoding="utf-8") as outputCsv:
        writer = csv.DictWriter(outputCsv, fieldnames=fieldnames,delimiter=';')
        writer.writeheader()
        writer.writerows(newCSV)
    return streetCSVPath

def CSVToDict(file):
    with open(file,encoding="utf-8") as inputCsv:
        return [rows for rows in csv.DictReader(inputCsv,delimiter=';')]

def lampCSVtoObject(file,defaultHeight=10):
    lamps = []
    csvDict = CSVToDict(file)
    for row in csvDict:
        shapelyPoint = shape(json.loads(row["geo_shape"]))
        coords = shapelyPoint.y, shapelyPoint.x
        height = float(row["Hauteur du support (en mètre)"]) if row["Hauteur du support (en mètre)"] != "" else defaultHeight
        luminousFlux = float(row["Flux de la lampe (en Lumen)"])
        rue = row["Identifiant de la voie entière"]
        arrondissement = row["Libellé de la région technique"]
        lamps.append(Lamp(coords,height,luminousFlux,rue,arrondissement))
    return lamps

def commonCSVtoObject(file):
    csvDict = CSVToDict(file)
    if "volumes" in file:
        return gdp.GeoSeries([shape(json.loads(row["geom"])) for row in csvDict],crs="EPSG:2154")
    return gdp.GeoSeries([shape(json.loads(row["geo_shape"])) for row in csvDict],crs="EPSG:2154")

def extractDB(location,dist=100,defaultLampHeight=10):
    lamps = lampCSVtoObject(extractStreetFromCSV("eclairage-public",location,dist),defaultLampHeight)
    # voirie = commonCSVtoObject(extractStreetFromCSV("plan-de-voirie-chaussees",location,dist))
    # volumes = commonCSVtoObject(extractStreetFromCSV("volumesbatisparis",location,dist))
    # return lamps, voirie, volumes
    return lamps