import {Map, View} from 'ol';
import MousePosition from 'ol/control/MousePosition';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {Style, Fill, Stroke, Text} from 'ol/style';
import Stroke from 'ol/style/Stroke';
import Feature from 'ol/Feature';
import Fill from 'ol/style/Fill';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import Icon from 'ol/style/Icon';
import 'ol/ol.css';
import {FullScreen, ScaleLine, defaults as defaultControls } from 'ol/control';
import {createStringXY} from 'ol/coordinate';
import Select from 'ol/interaction/Select';
import {fromLonLat, transform} from 'ol/proj';
import LineString from 'ol/geom/LineString';
import { defaults, isEmpty, map } from 'lodash';
import {defaults as defaultInteractions} from 'ol/interaction';
import {click} from 'ol/events/condition';

import BOMBER from 'data-url:./icons/plane.png';
import ORD from 'data-url:./icons/ordinance.png';
import SELF from 'data-url:./icons/self.svg';
import { oldlace } from 'color-name';


// Initialize globals
const osmSource = new OSM();
const otherLayer = new TileLayer({
  source: new OSM({
    opaque: false,
    url: 'http://a.tile.stamen.com/toner-lite/{z}/{x}/{y}.png'
  })
});
const attributions = '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';
const GeoJsonSource = new VectorSource();
const select = new Select({
  condition: click
});
const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(4),
  projection: 'EPSG:4326',
});
const symbols = {"BOMBER" : BOMBER,
                    "ORD" : ORD,
                    "SELF" : SELF};

// fetch the json files
function fetchData() {
  fetch('http://localhost:3000/geoJson/tech.geojson', {mode: 'cors'})
  .then(function(response) {
    return response.json();
  })
  .then(function(json) {
    // Read features, clear the current layer features
    const format = new GeoJSON();
    const features = format.readFeatures(json);
    GeoJsonSource.clear();

    // retrieve the type of the GeoJSON geometry
    features.forEach(function(feature){
      // map the feature properties
      let properties = feature.getProperties();

      let id = properties["id"];
      let alt = properties["alt"];
      let plat = properties["plat"];
      let model = properties["model"];
      let dent = properties["dent"];
      let name = properties["name"];
      let color = properties["color"];

      // transform feature
      feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
      
      switch(dent) {
        case("FRIENDLY"):
          feature.setStyle(styleFeature(symbols[plat], 'green', name, id));
          break;
        case("HOSTILE"):
          feature.setStyle(styleFeature(symbols[plat], 'red', name, id));
          break;
        default:
          feature.setStyle(styleFeature(symbols[plat], color , name, id));
          break;
      }

      if (!isEmpty(feature.getProperties()["flightpath"]))
      {
        // Create a line string to represent the flight path
        var flightPath = new LineString(properties["flightpath"]);
        var flightPathFeature = createFlightpathFeature(flightPath, 'red');

        // calculate the image rotation based on its trajectory
        /*let currCoord = feature.getGeometry();
        let nextCoord = flightPath.getCoordinates()[1];
        let rads = Math.atan2((nextCoord[0] - currCoord[0]), (nextCoord[1] - currCoord[1]));
        console.log(feature.getStyle()[0].getImage().setRotation(Math.PI / 2));
        console.log(flightPath.getCoordinates()[1]);*/

        GeoJsonSource.addFeature(flightPathFeature);
      }

      // set properties to null if not exist
      feature.setProperties({"id": id || '',
                            "alt": alt || '',
                            "plat": plat || '',
                            "model": model || '',
                            "dent" : dent || '',
                            "name" : name || '',
                            });
      GeoJsonSource.addFeature(feature);
    });
  });

  map1.render();
}

function styleFeature(src, color, bottomText, topText) {
  return [new Style({
            image: new Icon({
            color: color || 'white',
            crossOrigin: 'anonymous',
            scale: 0.3,
            src: src
          }),
            text: new Text({
            text: bottomText || '',
            offsetY: '40',
            fill: new Fill({color: '#39FF14'}),
            stroke: new Stroke({width: 3}),
            font: '20px monospace'
          }),
        }),
          new Style({
            text: new Text({
            text: topText || '',
            offsetY: '-40',
            fill: new Fill({color: '#39FF14'}),
            stroke: new Stroke({width: 3}),
            font: '20px monospace'
          }),
        })
      ];
}

function createFlightpathFeature(coordinates, color, width)
{
  // convert the coordinates to a valid LineString()
  var path = coordinates;
  // add to the map
  path.transform('EPSG:4326', 'EPSG:3857');
  var feature = new Feature({geometry: path});
  feature.setStyle(new Style({
    stroke: new Stroke({ 
      width: width || 3, 
      color: color || 'red'
    })
  }));

  return feature;
}

/*
const circlePoints = [
  new Feature({
    geometry: new CircleGeom(fromLonLat([-84.39, 33.77]), 100)}),
  new Feature({
    geometry: new CircleGeom(fromLonLat([-84.39, 33.77]), 150)}),
  new Feature({
    geometry: new CircleGeom(fromLonLat([-84.39, 33.77]), 200)}),
  ];

circlePoints.forEach(v => v.setStyle(circleGeomStyle()));
const vectorPoint2 = new Feature({
  geometry: new Point(fromLonLat([-84.37, 33.77])),
});
vectorPoint2.setStyle(planeStyle());*/

var map1 = new Map({
  controls: defaultControls().extend([
    mousePositionControl,
    new FullScreen(),
  ]),
  interactions: defaultInteractions({doubleClickZoom: false}),
  target: 'map1',
  view: new View({
    center: fromLonLat([-84.39, 33.77]),
    zoom: 15
  }),
  layers: [
    new TileLayer({
      attributions: attributions,
      source: osmSource,
      }),
    otherLayer,
  ]
});


// Finalize map generation
map1.addLayer(new VectorLayer({source: GeoJsonSource}));
map1.on('postrender', fetchData); // setup network fetching
map1.addInteraction(select);
map1.on('pointermove', function(e) {
  if (!e.dragging){
    var pixel = map1.getEventPixel(e.originalEvent);
    map1.getTargetElement().style.cursor = map1.hasFeatureAtPixel(pixel) ? 'pointer': '';
  }
});

// Display object information
select.on('select', function(e) {
  var selectedFeatures = e.target.getFeatures();

  if (selectedFeatures.getLength() == 0){
    document.getElementById("info").style.visibility = 'hidden';
  }
  else {
    selectedFeatures.forEach(function(feature) {
      var model = feature.getProperties()["model"];
      // Make sure our selected feature is an icon
      if (model) {
        document.getElementById("info").style.visibility = 'visible';

        // populate html fields
        var properties = feature.getProperties();
        console.log(properties);
        for (var key in properties) {
          let element = document.getElementById(key);
          if (element)
            document.getElementById(key).innerHTML = key + " : " + (properties[key] ? properties[key] : "N/A");
        }
        /*var id = feature.getProperties()['id'];
        var name = feature.getProperties()['name'];
        var color = feature.getProperties()['color'];
        document.getElementById("info").style.visibility = 'visible';

        // Populate information
        document.getElementById("type").innerHTML = type;
        document.getElementById("id").innerHTML = id;
        document.getElementById("name").innerHTML = name;*/
      }
    });
  }
});


fetchData();

let r = 0;
setInterval(function() {
  r = r + Math.PI/1000;
  map1.getView().setRotation(r);
}, 100000)