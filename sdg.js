import {Map, View, Collection} from 'ol';
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
import {createStringXY, toStringHDMS} from 'ol/coordinate';
import Select, { SelectEvent } from 'ol/interaction/Select';
import {fromLonLat, toLonLat} from 'ol/proj';
import LineString from 'ol/geom/LineString';
import { defaults, isEmpty, map } from 'lodash';
import {defaults as defaultInteractions} from 'ol/interaction';
import {click} from 'ol/events/condition';
import {Circle as CircleGeom, Point} from 'ol/geom';

import BOMBER from 'data-url:./icons/plane.png';
import ORD from 'data-url:./icons/ordinance.png';
import SELF from 'data-url:./icons/self.svg';
import { oldlace } from 'color-name';
import CircleStyle from 'ol/style/Circle';


////////////////////////////////
//    Initialize globals     ///
////////////////////////////////
const REFRESH_RATE = 1000; // in ms
const stamenLayer = new TileLayer({
  source: new OSM({
    opaque: false,
    url: 'http://a.tile.stamen.com/toner-lite/{z}/{x}/{y}.png'
  })
});
const symbols = {"BOMBER" : BOMBER,
                    "ORD" : ORD,
                    "SELF" : SELF};
const attributions = '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';
const GeoJsonSource = new VectorSource(); // for features on the map
const OverlaySource = new VectorSource(); // for displaying selected features
var selectedFeatures;
const mousePositionControl = new MousePosition({ //for displaying coordinates on mouse position
  coordinateFormat: createStringXY(4),
  projection: 'EPSG:4326',
});

////////////////////////////////////////////
//    Handles for feature selections     ///
////////////////////////////////////////////
const select = new Select({
  condition: click
});
// For overlaying features on top of the map (i.e. selection reticle)
const selectionOverlay = new Feature({
  geometry: new Point(fromLonLat([-84.39, 33.77])),

});
selectionOverlayStyle =new Style({
  image: new CircleStyle({
    radius: 20,
    stroke: new Stroke({color: 'black', width: 3, lineDash: [6]})
  })});
selectionOverlay.setStyle(new Style(null));
OverlaySource.addFeature(selectionOverlay);


/**
 * Fetches GeoJSON data from an API endpoint using an HTTP Request (.fetch())
 * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
 * 
 * Initiates the fetch() promise to draw features onto our map
 */
function fetchData() {
  fetch('http://localhost:3000/geoJson/tech.geojson', {mode: 'cors'})
  .then(function(response) {
    return response.json();
  })
  /**
   * Uses GeoJSON properties to generate features, style them, and add properties to them on the map
   * 
   * @param {json}
   */
  .then(function(json) {
    // Read features, clear the current layer features
    const format = new GeoJSON();
    const features = format.readFeatures(json);
    GeoJsonSource.clear();

    features.forEach(function(feature){
      // Map the feature properties
      let properties = feature.getProperties();

      let id = properties["id"];
      let alt = properties["alt"];
      let plat = properties["plat"];
      let model = properties["model"];
      let dent = properties["dent"];
      let name = properties["name"];
      let color = properties["color"];

      // Transform feature from EPSG:4326 to EPSG:3857 coordinates and apply stylings
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

      // Generate flightpath if applicable, and rotate the feature toward the next valid waypoint
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

      // Set feature properties to null if not exist
      feature.setProperties({"id": id || '',
                            "alt": alt || '',
                            "plat": plat || '',
                            "model": model || '',
                            "dent" : dent || '',
                            "name" : name || '',
                            });
      feature.setId(id || name);

      // add feature to map
      GeoJsonSource.addFeature(feature);
    })
  })
  /**
   * Updates the GUI if needed, which sits on top of the OpenLayers
   */
  .then(function(){
    // Update the info section
    var info = document.getElementById("info");
    if (info.style.visibility == 'visible')
    {
      // get the feature by its ID
      let feature = GeoJsonSource.getFeatureById(selectedFeatures.item(0).getId());
      // Send the feature as a collection to handleSelectioN()
      handleSelection(new Collection([feature]));
    }
  });
  map1.render();
  setTimeout(fetchData, REFRESH_RATE); // fetch data again after some time
}

/**
 * Returns a style based on the feature's properties
 * 
 * @param {*} src - An image import
 * @param {string} color - Color in string, hex or rgba() format
 * @param {string} bottomText
 * @param {string} topText
 * @return {Style}
 */
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

/**
 * Transforms flightpath coordinates to a feature on the map
 * 
 * @param {Coordinate} coordinates
 * @param {string} color - Color in string, hex or rgba() format
 * @param {number} width
 * @return {LineString} feature
 */
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

/**
 * Extracts properties out of a selected feature and populates fields in the HUD with information
 * Sets feature style & geometry
 * 
 * @param {Collection} selectedFeatures - Collection of an array of features
 */
function handleSelection(selectedFeatures)
{
  if (selectedFeatures.getLength() == 0){
    document.getElementById("info").style.visibility = 'hidden';
    selectionOverlay.setStyle(new Style(null));
  }
  else {
    selectedFeatures.forEach(function(feature) {
      var model = feature.getProperties()["model"];
      // Make sure our selected feature is an icon
      if (model) {
        document.getElementById("info").style.visibility = 'visible';

        // populate html fields
        var properties = feature.getProperties();

        // console.log(properties);
        for (var key in properties) {
          let element = document.getElementById(key);
          if (element)
            document.getElementById(key).innerHTML = key + " : " + (properties[key] ? properties[key] : "N/A");
        }
        // populate the coordinates
        let element = document.getElementById('loc');
        let loc = toLonLat(feature.getGeometry().getCoordinates());
        document.getElementById('loc').innerHTML = toStringHDMS(loc, 1);

        // move the selection to the clicked feature
        selectionOverlay.setGeometry(properties["geometry"]);
        selectionOverlay.setStyle(selectionOverlayStyle);
      }
    });
  }
}

// Initialize the map
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
    stamenLayer,
  ]
});


// Finalize map generation
map1.addLayer(new VectorLayer({source: GeoJsonSource}));
map1.addLayer(new VectorLayer({source: OverlaySource}));
map1.addInteraction(select);
map1.on('pointermove', function(e) {
  if (!e.dragging){
    var pixel = map1.getEventPixel(e.originalEvent);
    map1.getTargetElement().style.cursor = map1.hasFeatureAtPixel(pixel) ? 'pointer': '';
  }
});

// Display feature information
select.on('select', function(e) {
  selectedFeatures = e.target.getFeatures();

  handleSelection(selectedFeatures);
});

// Begin data gathering
fetchData();

let r = 0;
setInterval(function() {
  r = r % (Math.PI * 2) + Math.PI / 300;
  map1.getView().setRotation(r);
  console.log(map1.getView().getRotation());
  let coord = fromLonLat([-84.40070629119873,
    33.76908954476728]);
    //map1.getView().setCenter(coord);
}, 1000)