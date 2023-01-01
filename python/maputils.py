from classes import *
import folium
import webbrowser
import os

MAP_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"out/map.html")

def displayLamps(m,lamps):

    [folium.Marker( 
    location=lamp.coords,
    icon=lamp.icon
    ).add_to(m) for lamp in lamps]

# def displayVoirie(m,voirie):
#     #voirie.to_csv("tempStreets.csv",";")
#     #temp = gdp.GeoDataFrame(geometry=voirie)
#     #temp.to_csv("tempGDF.csv",";")
#     # temp.plot()
#     # plt.show(block=True)
#     folium.GeoJson(voirie.to_json()).add_to(m)
#     #print(type(voirie[3]))

def displayGeoseries(m,geoseries,style):
    folium.GeoJson(geoseries.to_json(),style_function=lambda x :style).add_to(m)

def saveAndDisplay(m):
    m.save(MAP_PATH)
    webbrowser.open(os.path.realpath(MAP_PATH))