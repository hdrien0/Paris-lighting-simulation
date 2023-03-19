from folium.elements import JSCSSMixin
from folium.map import Layer
from folium.utilities import parse_options
from jinja2 import Template

import json

class Illuminance(JSCSSMixin, Layer):

    _template = Template(u"""
        {% macro script(this, kwargs) %}
            var {{ this.get_name() }} = L.illuminanceLayer(
                {{ this.lampsJSON }},
                {{ this.voirieJSON }},
                {{ this.buildings }},
                {{ this.options|tojson }}
            ).addTo({{ this._parent.get_name() }});
        {% endmacro %}
        """)

    default_js = [
        ('extra.js',
         './extra.js'),
        ('geojson-vt.js',
         'https://unpkg.com/geojson-vt@3.2.0/geojson-vt.js'),
         ('illuUtils.js',
         './illuUtils.js'),
        ('leaflet-illuminance.js',
         './leaflet-illuminance.js')
         
    ]

    def __init__(self, lamps, voirie, buildings, opacity,
                 maxZoom, cellSize, name=None, max=None,
                 overlay=True, control=True, show=True, **kwargs):
        super(Illuminance, self).__init__(name=name, overlay=overlay,
                                      control=control, show=show)
        self._name = 'illuminance'
        self.lampsJSON = json.dumps([lamp.toDict() for lamp in lamps])
        self.voirieJSON = voirie.to_json()
        self.buildings = buildings
        self.options = parse_options(
            opacity=opacity,
            maxZoom=maxZoom,
            cellSize=cellSize,
            max=max,
            **kwargs
        )