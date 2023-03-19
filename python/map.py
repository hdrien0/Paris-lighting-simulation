import folium
import argparse
import osmnx as ox
from illuminancePlugin import Illuminance
from csvutils import *
from maputils import *
from classes import *

ox.config(log_console=False, use_cache=True)

style1 = {'fillColor': '#2e669e', 'color': '#2e669e'}
style2 = {'fillColor': '#bf0d0d', 'color': '#bf0d0d'}

parser = argparse.ArgumentParser(description='')
parser.add_argument('--location','-l', required=True)
parser.add_argument('--distance','-d', required=False,default=100)
parser.add_argument('--cellSize',required=False,default=4)
parser.add_argument('--gradientMax',required=False,default=80)
args = parser.parse_args()

coords = getCoordinatesFromStreetName(args.location)

LAMPS,VOIRIE = extractDB(args.location,int(args.distance))

buildingsGdf = ox.geometries_from_point(getCoordinatesFromStreetName(args.location),dist=int(args.distance),tags={'building': True})
buildingsGdf = buildingsGdf[buildingsGdf.geom_type != 'Point']
buildings = buildingsGdf.geometry

M = folium.Map(location=coords, tiles="cartodb positron", zoom_start=20, control_scale=True, max_zoom = 21)

Illuminance(LAMPS,VOIRIE,buildings.to_json(),opacity=0.3,maxZoom=16,cellSize=int(args.cellSize),max=int(args.gradientMax)).add_to(M)

displayGeoseries(M,buildings,style2)
#displayGeoseries(M,VOIRIE,style1)
saveAndDisplay(M)