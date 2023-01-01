var luminousFluxToLuminousIntensityUniform = function (flux,coneAngle){
    var solidAngle = 2*Math.PI*(1-Math.cos(coneAngle/2));
    return flux/solidAngle;
}

var illuminanceFromLamp = function (lamp,point,cutOff=true){
    var coneAngle = 150*Math.PI/180;
    var luminousIntensity = luminousFluxToLuminousIntensityUniform(lamp.luminousFlux,coneAngle);
    var distance2D = point.distanceTo(lamp.coords);
    var distance = Math.sqrt((distance2D**2)+(lamp.height**2));

    var cosTheta = lamp.height/distance;
    if (Math.acos(cosTheta)>coneAngle/2 && cutOff){
        cosTheta=0
    }
    return luminousIntensity * cosTheta / (distance**2);
};

var createLampMarkers = function(lamps){
    var markerIcon = L.icon({
        iconUrl: 'lightbulb.svg',    
        iconSize:     [20, 20], // size of the icon
        iconAnchor:   [10, 20], // point of the icon which will correspond to marker's location
        popupAnchor:  [0, -20] // point from which the popup should open relative to the iconAnchor
    });
    var markers = [];
    for (var i=0;i<lamps.length;i+=1){  
        var popup = L.popup().setContent(`<p><b>Luminous flux</b>: ${lamps[i].luminousFlux} lumen<br /><b>Heigth</b>: ${lamps[i].height} meters</p>`);
        markers.push(L.marker(lamps[i].coords,{"icon":markerIcon}).bindPopup(popup));
    }
    return L.layerGroup(markers);
}

var vectorTileToPolyCollection = function(tile,tileCoords,tileExtent){
    var polys = [],
    size = tileExtent * Math.pow(2, tileCoords[0]),
    x0 = tileExtent * tileCoords[1],
    y0 = tileExtent * tileCoords[2];

    if (!tile){
        return Extra.Turf.featureCollection([]);
    }

    function project(points) {
        var newPoints = [];
        for (var j = 0; j < points.length; j++) {
            var p = points[j], y2 = 180 - (p[1] + y0) * 360 / size;
            newPoints.push([
                (p[0] + x0) * 360 / size - 180,
                360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90
            ]);
        }
        return newPoints;
    }
    for (var i = 0; i < tile.numFeatures; i++){
        for (var j = 0; j < tile.features[i].geometry.length; j++){
            projected = project(tile.features[i].geometry[j]);
            polys.push(Extra.Turf.polygon([projected]));
        }
        
    }

    return Extra.Turf.featureCollection(polys);

};

var vectorTileBoundingBox = function(tileCoords){
    var zoom = tileCoords[0],
    xtile = tileCoords[1],
    ytile = tileCoords[2];

    Z2 = Math.pow(2, zoom);

    var ul_lon_deg = xtile / Z2 * 360.0 - 180.0,
    ul_lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ytile / Z2))),
    ul_lat_deg = (ul_lat_rad * 180) / Math.PI;

    var lr_lon_deg = (xtile + 1) / Z2 * 360.0 - 180.0,
    lr_lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (ytile + 1) / Z2))),
    lr_lat_deg = (lr_lat_rad*180)/Math.PI;

    var bounds = [[ul_lon_deg,ul_lat_deg],[ul_lon_deg, lr_lat_deg],[lr_lon_deg, lr_lat_deg],[lr_lon_deg, ul_lat_deg],[ul_lon_deg,ul_lat_deg]],
    boundingBox = Extra.Turf.polygon([bounds]);
    return boundingBox;
}

var removeCoordinate = function(list,coord){
    newList = [];
    for(var k = 0; k < list.length; k++){
        if(list[k][1] == coord[1] && list[k][2] == coord[2]){
          continue;
        }
        newList.push(list[k]);
    }
    return newList;
};

var orderTiles = function(tileCoords,centerPoint,limits){
    var centerTile = Extra.Cover.tiles(centerPoint,limits)[0];
    centerTile.unshift(centerTile.pop());
    tileCoords = removeCoordinate(tileCoords,centerTile);
    var newTileCoords = [centerTile];
    while (tileCoords.length!=0){
        var previousTile = newTileCoords[newTileCoords.length-1];
        for (var i=0;i<tileCoords.length;i++){
            if (Math.abs(tileCoords[i][1]-previousTile[1])+Math.abs(tileCoords[i][2]-previousTile[2])<2){
                newTileCoords.push(tileCoords[i]);
                tileCoords = removeCoordinate(tileCoords,tileCoords[i]);
                break;
            }
        }
    }
    return newTileCoords;        
}

var getClosestCollisionPoint = function(center,ray,polys,tileCoords,reverseMode=false){
    var intersects = Extra.Turf.lineIntersect(ray, polys);

    if (intersects.features.length == 0){
        return null;
    }
    if (!reverseMode){
        return Extra.Turf.nearestPoint(center,intersects);
    }
    var intersectsNb = intersects.features.length;
    for (var i=0; i<intersectsNb; i+=1){
        var candidate = intersects.features[i];
        var angle = Extra.Turf.bearing(center,candidate.geometry.coordinates)
        var testPoint = Extra.Turf.transformTranslate(candidate,0.1,angle,{units:"meters"});
        var tileBB = vectorTileBoundingBox(tileCoords);
        
        if (Extra.Turf.booleanPointInPolygon(testPoint,tileBB)) {
            if (!Extra.Turf.booleanPointInPolygon(testPoint,Extra.Turf.combine(polys).features[0].geometry)){
                return testPoint;
            }
        }
    }
    return null
};

var rayCastIlluminatedZone = function(map,center,deltaAngle,tileIndex,drawCollisions,returnAsPoints=false,reverseMode=false){
    var simplifyOptions = {tolerance: 0.000001, highQuality: false};
    var tilesCache = {};
    var hitCoords = [];
    var hitCoordsAsTurfPoints = []
    var centerPoint = Extra.Turf.point(center);
    var bounds = map.getBounds();
    var length = map.distance(bounds.getNorthWest(),bounds.getNorthEast());
    var zoom = map.getZoom();
    var limits = {
        min_zoom: zoom,
        max_zoom: zoom
    };
    
    for (var a = 0; a<360;a+=deltaAngle){
        var endPoint = Extra.Turf.transformTranslate(centerPoint,length,a,{units:"meters"});
        var ray = Extra.Turf.lineString([center,endPoint.geometry.coordinates]);
        var tilesCoords = Extra.Cover.tiles(ray.geometry, limits);
        tilesCoords.forEach(function (coord) {
            coord.unshift(coord.pop());
        });
        tilesCoords = orderTiles(tilesCoords,centerPoint.geometry,limits);
        var collisionPoint = endPoint;
        for (var i = 0; i<tilesCoords.length;i++){
            cached = tilesCache[tilesCoords[i].join()];
            if (cached==null){
                var tile = tileIndex.getTile(...tilesCoords[i]);
                tilesCache[tilesCoords[i].join()] = tile;
            } else{
                var tile = cached;
            }
            var gj = vectorTileToPolyCollection(tile,tilesCoords[i],256);
            var foundPoint = getClosestCollisionPoint(centerPoint,ray,gj,tilesCoords[i],reverseMode);
            if (foundPoint != null){
                collisionPoint = foundPoint;
                break;
            }
        }
        hitCoords.push(collisionPoint.geometry.coordinates);
        hitCoordsAsTurfPoints.push(collisionPoint);
        if (drawCollisions && a%5==0){
            L.marker([collisionPoint.geometry.coordinates[1],collisionPoint.geometry.coordinates[0]]).addTo(map);
            L.geoJSON(ray).addTo(map);
        }
    }
    hitCoords.push(hitCoords[0]); //polygon coords must loop
    if (returnAsPoints){
        return Extra.Turf.featureCollection(hitCoordsAsTurfPoints);
    }
    return hitCoords.length>3 ? Extra.Turf.simplify(Extra.Turf.polygon([hitCoords]),simplifyOptions) : null;
};

var updateIlluminatedZones = function(map,lamps,tileIndex,drawPolys=false){
    if (!lamps || !map || !tileIndex){
        return null
    }
    console.time("Calculation of illuminated zones");  
    for (l = 0, len = lamps.length; l < len; l++) { 
        if (!lamps[l].area){
            lamps[l].area = rayCastIlluminatedZone(map,[lamps[l].coords[1],lamps[l].coords[0]],0.5,tileIndex,drawPolys);
            if (drawPolys){
                L.geoJson(lamps[l].area).addTo(map);
            }
        }
    }
    console.timeEnd("Calculation of illuminated zones");
    return lamps
}

var calculateIlluminanceOfPoint = function(pointLatLng,lamps){
    if (!lamps){
        return 0
    }
    var totalIlluminance = 0;
    for (k = 0, len3 = lamps.length; k < len3; k++) {          
        if (!lamps[k].area || !Extra.Turf.booleanPointInPolygon(Extra.Turf.point([pointLatLng.lng,pointLatLng.lat]),lamps[k].area)){
            continue;
        }
        var illuminance = illuminanceFromLamp(lamps[k],pointLatLng);
                
        totalIlluminance += illuminance;  
    }
    return totalIlluminance;
}

var fixLampsPosition = function(map,lamps,tileIndex){
    if (!lamps || !map || !tileIndex){
        return null
    }
    var zoom = map.getZoom();
        var limits = {
            min_zoom: zoom,
            max_zoom: zoom
        };
    
    var lampsCount = lamps.length;
    for (var l = 0; l < lampsCount; l+=1) { 
        var position = Extra.Turf.point([lamps[l].coords[1],lamps[l].coords[0]]);
        var tileCoord = Extra.Cover.tiles(position.geometry, limits)[0];
        tileCoord.unshift(tileCoord.pop());
        var tile = tileIndex.getTile(...tileCoord);
        var buildingFC = vectorTileToPolyCollection(tile,tileCoord,256);
        var inBuilding = false;
        for (var j = 0; j< buildingFC.features.length; j+=1) {
            if(Extra.Turf.booleanPointInPolygon(position,buildingFC.features[j],{'ignoreBoundary':true})){
                inBuilding = true;
                break;
            }
        }
        if (inBuilding){
            var hitCoordsFC = rayCastIlluminatedZone(map,[lamps[l].coords[1],lamps[l].coords[0]],0.5,tileIndex,false,true,true);
            var nearestCollisionPoint = Extra.Turf.nearestPoint(position,hitCoordsFC);
            lamps[l].coords = [nearestCollisionPoint.geometry.coordinates[1],nearestCollisionPoint.geometry.coordinates[0]];
        }
    }
    return lamps;
}