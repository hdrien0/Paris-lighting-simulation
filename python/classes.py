import folium.plugins as plugins

class Lamp(object):
    def __init__(self, coords, height, luminousFlux, rue=None, arrondissement=None):

        self.coords = coords #lat,lon tuple
        self.height = height
        self.luminousFlux = luminousFlux
        self.rue = rue
        self.arrondissement = arrondissement
        self.icon = plugins.BeautifyIcon(
            icon='lightbulb-o',
            prefix='fa',)
            
    def toDict(self):
        return {
            'coords': self.coords,
            'height': self.height,
            'luminousFlux' : self.luminousFlux
        }
