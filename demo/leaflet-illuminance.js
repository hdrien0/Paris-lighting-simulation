/*
Based on Leflet.idw, see the following comment.
*/

/*
 (c) 2016, Manuel Bär (www.geonet.ch)
 Leaflet.idw, a tiny and fast inverse distance weighting plugin for Leaflet.
 Largely based on the source code of Leaflet.heat by Vladimir Agafonkin (c) 2014
 https://github.com/Leaflet/Leaflet.heat
 version: 0.0.2
*/
!function(){
    "use strict";
    
        function simpleilluminance(canvas) {
            if (!(this instanceof simpleilluminance)) return new simpleilluminance(canvas);
    
            this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    
            this._ctx = canvas.getContext('2d',{willReadFrequently: true});
            this._width = canvas.width;
            this._height = canvas.height;
            this._data = [];
        }

        simpleilluminance.prototype = { 
    
            defaultCellSize: 25,
    
            defaultGradient: {
                0.0: '#000066',
                0.1: 'blue',
                0.2: 'cyan',
                0.3: 'lime',
                0.4: 'yellow',            
                0.5: 'orange',
                0.6: 'red',
                0.7: 'Maroon',
                0.8: '#660066',
                0.9: '#990099',
                1.0: '#ff66ff'
            },

            data: function (data) {
                this._data = data;
                return this;
            },
    
            max: function (max) {
                this._max = max;
                return this;
            },
    
            add: function (point) {
                this._data.push(point);
                return this;
            },
    
            clear: function () {
                this._data = [];
                return this;
            },
    
            cellSize: function (r) {
                // create a grayscale blurred cell image that we'll use for drawing points
                var cell = this._cell = document.createElement("canvas"),
                    ctx = cell.getContext('2d');
                    this._r = r;
    
                cell.width = cell.height = r;
    
                ctx.beginPath();
                ctx.rect(0, 0, r, r);
                ctx.fill();
                ctx.closePath();
    
                return this;
            },
    
            resize: function () {
                this._width = this._canvas.width;
                this._height = this._canvas.height;
            },
    
            gradient: function (grad) {
                // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
                var canvas = document.createElement("canvas"),
                    ctx = canvas.getContext('2d'),
                    gradient = ctx.createLinearGradient(0, 0, 0, 256);
    
                canvas.width = 1;
                canvas.height = 256;
    
                for (var i in grad) {
                    gradient.addColorStop(+i, grad[i]);
                }
    
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 1, 256);
    
                this._grad = ctx.getImageData(0, 0, 1, 256).data;
    
                return this;
            },
    
            draw: function (opacity) {
                console.log(`current_max : ${this._max}`)
                if (!this._cell) this.cellSize(this.defaultCellSize);
                if (!this._grad) this.gradient(this.defaultGradient);
                
                var ctx = this._ctx;
    
                ctx.clearRect(0, 0, this._width, this._height);
    
                // draw a grayscale illuminance map by putting a cell at each data point
                for (var i = 0, len = this._data.length, p; i < len; i++) {
                    p = this._data[i];
                    ctx.globalAlpha = p[2] / this._max;
                    ctx.drawImage(this._cell, p[0] - this._r, p[1] - this._r);
                }
    
                // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
                var colored = ctx.getImageData(0, 0, this._width, this._height);
                this._colorize(colored.data, this._grad, opacity);
                
                ctx.putImageData(colored, 0, 0);
    
                return this;
            },
    
            _colorize: function (pixels, gradient, opacity) {
                for (var i = 0, len = pixels.length, j; i < len; i += 4) {
                    j = pixels[i + 3] * 4; 
    
                        pixels[i] = gradient[j];
                        pixels[i + 1] = gradient[j + 1];
                        pixels[i + 2] = gradient[j + 2];
                        pixels[i + 3] = opacity*256;
                }
            }
        },
        window.simpleilluminance = simpleilluminance
    }(),
    
    L.IlluminanceLayer = (L.Layer ? L.Layer : L.Class).extend({

        initialize: function (lampsJSON, buildings, options) {
            var geojsonvt_opt = {
            
                maxZoom: 24,  // max zoom to preserve detail on; can't be higher than 24
                tolerance: 0, // simplification tolerance (higher means simpler)
                extent: 256, // tile extent (both width and height)
                buffer: 64,   // tile buffer on each side
                debug: 0,     // logging level (0 to disable, 1 or 2)
                lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
                promoteId: null,    // name of a feature property to promote to feature.id. Cannot be used with `generateId`
                generateId: false,  // whether to generate feature ids. Cannot be used with `promoteId`
                indexMaxZoom: 5,       // max zoom in the initial tile index
                indexMaxPoints: 100000 // max number of points per tile in the index
            
            };
            this._lamps = lampsJSON;
            this._lampMarkersLayer = {};
            this._buildings = buildings;
            this._tileIndex = geojsonvt(this._buildings,geojsonvt_opt);
            this._drawPolys = false;
            this._drawCollisions = false;
            this._drawIlluminance = true;
            this._counter = null;

            L.setOptions(this, options);
        },
    
        setLamps: function (lampsJSON) {
            this._lamps = lampsJSON;
            fixLampsPosition(this._map,this._lamps,this._tileIndex);
            updateIlluminatedZones(this._map,this._lamps,this._tileIndex);
            this._lampMarkersLayer.remove();
            this._lampMarkersLayer = createLampMarkers(this._lamps);
            this._lampMarkersLayer.addTo(this._map);
            this._layerControl.remove();
            this._layerControl = L.control.layers(null, {"Lamps":this._lampMarkersLayer}).addTo(this._map);
            return this.redraw();
        },
    
        addLamp: function (lampJSON) {
            this._lamps.push(lampJSON);
            updateIlluminatedZones(this._map,this._lamps,this._tileIndex);
            this._lampMarkersLayer.remove();
            this._lampMarkersLayer = createLampMarkers(this._lamps);
            this._lampMarkersLayer.addTo(this._map);
            this._layerControl.remove();
            this._layerControl = L.control.layers(null, {"Lamps":this._lampMarkersLayer}).addTo(this._map);
            return this.redraw();
        },
    
        setOptions: function (options) {
            L.setOptions(this, options);
            if (this._illu) {
                this._updateOptions();
            }
            return this.redraw();
        },

        redraw: function () {
            if (this._illu && !this._frame && !this._map._animating) {
                this._frame = L.Util.requestAnimFrame(this._redraw, this);
            }
            return this;
        },
    
        onAdd: function (map) {
            this._map = map;
            fixLampsPosition(this._map,this._lamps,this._tileIndex);
            updateIlluminatedZones(this._map,this._lamps,this._tileIndex);
            this._lampMarkersLayer = createLampMarkers(this._lamps);
            this._layerControl = L.control.layers(null, {"Lamps":this._lampMarkersLayer}).addTo(this._map);
            this._lampMarkersLayer.addTo(this._map);

            L.Control.textbox = L.Control.extend({
                onAdd: function(map) {                
                    textBox = L.DomUtil.create('div');
                    textBox.id = "illu_counter";
                    textBox.innerHTML = "temp";
                    return textBox;
                },
        
                onRemove: function(map) {
                    // Nothing to do here
                },
                updateText: function(text){
                    textBox = L.DomUtil.get("illu_counter");
                    textBox.innerHTML = `<strong>${text} lux</strong>`;
                }

            });
            L.control.textbox = function(opts) { return new L.Control.textbox(opts);}
            this._counter = L.control.textbox({ position: 'topright' }).addTo(map);

            if (!this._canvas) {
                this._initCanvas();
            }
    
            map._panes.overlayPane.appendChild(this._canvas);
    
            map.on('moveend', this._reset, this);
            
            //console.log(this._canvas);
            var self = this;
            map.on('click', function(e) {        
                var location = e.latlng;
                console.log(location);
                self.addLamp({
                    "coords": [
                        location.lat,
                        location.lng
                    ],
                    "height": 10,
                    "luminousFlux": 18000,
                    "id" : self._lamps.length
                });
            });

            map.on('mousemove', function(e) {
                if (self._counter){                    
                    var illu = calculateIlluminanceOfPoint(e.latlng,self._lamps);
                    self._counter.updateText(illu.toFixed(1).toString());
                }
              });
    
            if (map.options.zoomAnimation && L.Browser.any3d) {
                map.on('zoomanim', this._animateZoom, this);
            }
    
            this._reset();
        },
    
        onRemove: function (map) {
            map.getPanes().overlayPane.removeChild(this._canvas);
    
            map.off('moveend', this._reset, this);
    
            if (map.options.zoomAnimation) {
                map.off('zoomanim', this._animateZoom, this);
            }
        },
    
        addTo: function (map) {
            map.addLayer(this);
            return this;
        },
    
        _initCanvas: function () {
            var canvas = this._canvas = L.DomUtil.create('canvas', 'leaflet-illuminance-layer leaflet-layer');
    
            var originProp = L.DomUtil.testProp(['transformOrigin', 'WebkitTransformOrigin', 'msTransformOrigin']);
            canvas.style[originProp] = '50% 50%';
    
            var size = this._map.getSize();
            canvas.width  = size.x;
            canvas.height = size.y;
    
            var animated = this._map.options.zoomAnimation && L.Browser.any3d;
            L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));
    
            this._illu = simpleilluminance(canvas);
            this._updateOptions();
        },
    
        _updateOptions: function () {
            this._illu.cellSize(this.options.cellSize || this._illu.defaultCellSize);
    
            if (this.options.gradient) {
                this._illu.gradient(this.options.gradient);
            }
            this._illu.max(this.options.max);
            
        },
    
        _reset: function () {
            var topLeft = this._map.containerPointToLayerPoint([0, 0]);
            L.DomUtil.setPosition(this._canvas, topLeft);
    
            var size = this._map.getSize();
    
            if (this._illu._width !== size.x) {
                this._canvas.width = this._illu._width  = size.x;
            }
            if (this._illu._height !== size.y) {
                this._canvas.height = this._illu._height = size.y;
            }
    
            this._redraw();
        },  
    
        _redraw: function () {
            if (!this._map) {
                return;
            }

            if (!this._drawIlluminance){
                this._frame = null;
                return;
            }
            
            var data = [],
            r = this._illu._r,
            size = this._map.getSize(),
            bounds = new L.Bounds(
                L.point([-r, -r]),
                size.add([r, r])),  
    
            cellCen = r / 2,
            nCellX = Math.ceil((bounds.max.x-bounds.min.x)/r)+1,
            nCellY = Math.ceil((bounds.max.y-bounds.min.y)/r)+1,

            i, len, cell, x, y, j, len2;
            
            console.time('process');

            var illus = [];
            for (i = 0, len = nCellY; i < len; i++) {
                for (j = 0, len2 = nCellX; j < len2; j++) {     
                
                    var x=i*r,y=j*r;
                    var point = L.point((y-cellCen), (x-cellCen));
                    var pointLatLng = this._map.containerPointToLatLng(point);

                    var illuminance = calculateIlluminanceOfPoint(pointLatLng,this._lamps);
                    
                    illus.push(illuminance)

                    cell = [j*r, i*r, illuminance];
                    
                    if (cell && cell[2]>0) {
                        data.push([
                            Math.round(cell[0]),
                            Math.round(cell[1]),
                            cell[2]
                        ]);
                    }
                }
            }
            var sum = illus.reduce((a, b) => a + b, 0);
            var avg = (sum / illus.length) || 0;

            console.timeEnd('process');

            console.time('draw ' + data.length);
            this._illu.data(data).draw(this.options.opacity);
            console.timeEnd('draw ' + data.length);
            console.log("-----------")
    
            this._frame = null;

        },
        _animateZoom: function (e) {
            var scale = this._map.getZoomScale(e.zoom),
                offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
    
            if (L.DomUtil.setTransform) {
                L.DomUtil.setTransform(this._canvas, offset, scale);
    
            } else {
                this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
            }
        }
    });
    
    L.illuminanceLayer = function (lampsJSON, buildings, options) {
        return new L.IlluminanceLayer(lampsJSON, buildings, options);
    };