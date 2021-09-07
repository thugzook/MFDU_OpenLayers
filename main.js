import {Map, View} from 'ol';
import {fromLonLat} from 'ol/proj';
import MousePosition from 'ol/control/MousePosition';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {Style, Fill, Stroke, Text} from 'ol/style';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import CircleGeom from 'ol/geom/Circle';
import Feature from 'ol/Feature';
import { GeometryFunction } from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import TileLayer from 'ol/layer/Tile';
import TileJSON from 'ol/source/TileJSON';
import circular from 'ol/geom/Polygon';
import TileWMS from 'ol/source/TileWMS';
import geometry from 'ol/geom/Geometry';
import OSM from 'ol/source/OSM';
import { getArea, getDistance } from 'ol/sphere';
import 'ol/ol.css';
import {ScaleLine, defaults as defaultControls } from 'ol/control';
import {createStringXY} from 'ol/coordinate';
import { Point } from 'ol/geom';
import { array } from 'assert-plus';

const view = new View({
  center: [-111.8, 40.7],
  zoom: 12,
});

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(4),
  projection: 'EPSG:4326',
});

const osmSource = new OSM();
const attributions = '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

function pointStyleFunction(color, radius) {
  return new Style({
    image: new CircleStyle({
      radius: radius || 30,
      fill: new Fill({color: color || 'rgba(0, 0, 255, 0.1)'}),
      stroke: new Stroke({color: 'blue', width: 1}),
    }),
    text: new Text({
      text: 'Test'
    })
  });
}

function circleGeomStyle() {
  return new Style({
    stroke: new Stroke({
      color: 'blue',
      width: '3'
    }),
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.1)'
    }),
    text: new Text({
      text: 'test',
      textBaseline: 'bottom',
      textAlign: 'left',
      placement: 'line'
    })
  })
}

const circlePoints = [
  new Feature({
    geometry: new CircleGeom([-111.8, 40.7], 0.05)}),
  new Feature({
    geometry: new CircleGeom([-111.8, 40.7], 0.08)}),
  new Feature({
    geometry: new CircleGeom([-111.8, 40.7], 0.1)}),
  ];

circlePoints.forEach(v => v.setStyle(circleGeomStyle()));
const vectorPoint2 = new Feature({
  geometry: new Point([-111.7, 40.7]),
});
vectorPoint2.setStyle(pointStyleFunction());

let r = 0;
setInterval(function() {
  r = r + Math.PI/100;
  map1.getView().setRotation(r);
  map1.getView().setCenter(view.getCenter());
}, 100000)

var map1 = new Map({
  controls: defaultControls().extend([
    new ScaleLine({
      units: 'metric',
    }),
    mousePositionControl
  ]),
  target: 'map1',
  view: view /*new View({
    projection: 'EPSG:3857', //HERE IS THE VIEW PROJECTION
    center: [0, 0],
    zoom: 2
  })*/,
  layers: [
    new TileLayer({
      attributions: attributions,
      source: osmSource,
      }),
    new VectorLayer({
      source: new VectorSource({
        features: circlePoints.concat(vectorPoint2)
      })
    }),
    new VectorLayer({
      source: new VectorSource({
        url: 'https://opendata.arcgis.com/datasets/c57777877aa041ecaef98ff2519aabf6_68.geojson',
        format: new GeoJSON()
      }),
      style: pointStyleFunction('red')
    })
  ]
});

var map2 = new Map({
  target: 'map2',
  view: view/*new View({
    projection: 'EPSG:4326', //HERE IS THE VIEW PROJECTION
    center: [0, 0],
    zoom: 2
  })*/,
  layers: [
    /*new TileLayer({
      attributions: attributions,
      source: new TileWMS({
        projection: 'EPSG:4326', //HERE IS THE DATA SOURCE PROJECTION
        url: 'https://ahocevar.com/geoserver/wms',
        params: {
          'LAYERS': 'ne:NE1_HR_LC_SR_W_DR'
        }
      })
    })*/
    new TileLayer({
      source: new TileJSON({
        url: 'https://a.tiles.mapbox.com/v3/aj.1x1-degrees.json?secure=1',
        crossOrigin: '',
      })
    })
  ]
});

var centerLongitudeLatitude = fromLonLat([-117.1610838, 32.715738]);

var map3 = new Map({
  target: 'map3',
  layers: [
    new TileLayer({
      source: osmSource
    })
  ],
  view: new View({
    projection: 'EPSG:4326',
    center: centerLongitudeLatitude,
    zoom: 12
  })
});

/* PROJECTION */
/*
var center = centerLongitudeLatitude;
var radius = 100;
var edgeCoordinate = [center[0] + radius, center[1]];
var area = getArea(Polygon);
var distance = getDistance('EPSG:3857', 'EPSG:4326');
var groundRadius = wgs84Sphere.haversineDistance(
    ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326'), 
    ol.proj.transform(edgeCoordinate, 'EPSG:3857', 'EPSG:4326')
);
var circularPolygon = circular(wgs84Sphere, center, radius, 64);

var layer = new VectorLayer({
  source: new VectorSource({
    features: [new Feature(new Circle(centerLongitudeLatitude, 4)), 
      new Feature(new Circle(centerLongitudeLatitude, 6))]
  }),
  style: [
    new Style({
      stroke: new Stroke({
        color: 'blue',
        width: 3
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.05)'
      })
    })
  ]
});
map3.addLayer(layer);

map3.getLayers*/
/*proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 ' +
    '+x_0=400000 +y_0=-100000 +ellps=airy ' +
    '+towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 ' +
    '+units=m +no_defs');
register(proj4);
var proj27700 = getProjection('EPSG:27700');
proj27700.setExtent([0, 0, 700000, 1300000]);

map.setView(new View({
  projection: 'EPSG:27700',
  center: [400000, 650000],
  zoom: 4
}));*/