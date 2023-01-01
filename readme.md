# Paris lighting simulation

**The project is still in its early stages, consider this more as a technical demo than as a physically accurate simulation. Contributions are welcome!**

The aim of the project is to simulate and provide a visual representation of the lighting of Paris streets by performing a 2D [illuminance](https://en.wikipedia.org/wiki/Illuminance) calculation at street level.
The position of street light sources and their characteristics is pulled from [a public Paris Data database.](https://opendata.paris.fr/explore/dataset/eclairage-public)

![Place de l'Odéon](https://i.imgur.com/acGlfRh.gif)  
Lighting simulation of *Place de l'Odéon*.  
Notice the illuminance reading on the top right. Live example

![simulation](https://i.imgur.com/c9CXBRb.gif)  
Simulation of two light poles side to side.

## Features  

* Simulate and visualise the lighting of any given area in Paris in the form of an interactive web map
* Read the calculated illuminance of a point on the street by hovering the pointer over it
* *In the future:* calculate the uniformity of the lighting of an area

## Installation and usage
* **Requirements**:
    * [Python 3](https://www.python.org/downloads/)
    * A console application and some basic command-line knowledge

* **Installation**:
    * Clone/download the repository 
    * Install the python libraries in ```requirements.txt```:  
    ```pip install -r requirements.txt```
    * Download the Paris Data public lighting database in CSV format [here](https://opendata.paris.fr/explore/dataset/eclairage-public/download/?format=csv&timezone=Europe/Berlin&lang=fr&use_labels_for_header=true&csv_separator=%3B) and copy it in the directory ```DB```

* **Usage**:
    * In the ```python``` directory, use:  
    ```python map.py -l "[location]"```  
    For example : ```python map.py -l "Place de l'Odéon"```
    * The generated map is located at ```out/map.html```

* **Optional**:
    * The option ```-d``` can be used to specify the radius of the simulation in meters (default is 100 meters)  
    * The option ```--cellSize``` can be used to specify the size of the cells (default is 4 pixels). The larger they are, the faster the rendering is.  


## How does it work?

* **Physics**
    * Illuminance of a point by a lighting appliance is calculated with Lambert's cosine law, taking into account the height of the lighting appliance and its luminous flux. 

* **Simulation and visualisation**
    * For each lighting appliance, the area that it can illuminate is determined by raycasting against buildings.  
    * The screen is divided into a grid. For each cell its total illuminance is calculated by adding the illuminance of each lighting appliance that illuminate the cell (using the fact that illuminance is additive).

## Limitations

* **Physical accuracy**:
    * [Paris Data public lighting database](https://opendata.paris.fr/explore/dataset/eclairage-public) only provides data on the luminous flux, so for now a uniform luminous intensity distribution is assumed along with a 75° beam cutoff angle. The solution to increase the accuracy of the simulation would be to use [luminous intensity distribution diagrams](https://iarc.uncg.edu/elight/learn/design/lc_sub/photodis.html). Those would need to be experimentally measured on real installations to reflect the effect of the reflector and the disposition of the light source.
    * For some lighting appliances, including most wall-mounted appliances the height data is missing in the Paris Data database. In this case a height of 10 meters is assumed, but it is not always accurate.

* **Performance** : For now the intended usage is to simulate lighting in a radius of about 100 meters around a given point. Simulation of larger areas or areas densely illuminated can be very slow at the moment.

## What does it use?

* **Mapping framework**
    * [Leaflet](https://github.com/Leaflet/Leaflet) is used as the mapping framework.  
    * The simulation/visualisation is written as a leaflet plugin in javascript. The rendering is based on the [Leaflet IDW plugin](https://github.com/spatialsparks/Leaflet.idw).
* **Databases**
    * [Paris Data public lighting database](https://opendata.paris.fr/explore/dataset/eclairage-public) is used to get the coordinates, height and luminous flux of lighting appliances.
    * [OSMnx](https://osmnx.readthedocs.io/en/stable) is used to query Open Street Map for building footprints
* **Data query and map generation**
    * Python is used to query the databases and generate the map with [Folium](https://github.com/python-visualization/folium).

## How is the project organized?

* The python part, located in the directory ```python``` handles extracting data from the databases and including it in the map generated with Folium.
* The generated map, in html format, relies on three javascript files present in the ```out``` directory:
    * ```leaflet-illuminance.js``` is the leaflet plugin and handles the leaflet integration along with the rendering.
    * ```illuUtils.js``` contains the core functions to simulate the lighting and calculate the illuminance of a point
    * ```extra.js``` includes the javascript dependencies listed earlier. It can be recreated by doing the following:
        * Download the javascript dependencies with ```npm install``` (requires [Node.js/NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))
        * Bundle them with ```browserify dependencies.js --s Extra --outfile out/extra.js```

## Possible improvements

* A feature to calculate the uniformity of the lighting of a given area
* Performance improvements
* Implement streaming the data from the databases instead of having it included it in the html file, so that the python generation isn't needed anymore
* Obtain luminous intensity distribution diagrams for common light appliances to increase the simulation accuracy

**Don't hesitate to contribute or to contact me!**