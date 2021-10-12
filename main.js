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
                    "DRONE" : BOMBER,
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
  fetch('http://localhost:3000/geoJson/mfduJson.geojson', {mode: 'cors'})
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

      // Rotate icon based on map rotation as long as feature != SELF
      if (plat != "SELF")
      {
        let image = feature.getStyle()[0].getImage();
        image.setRotateWithView(true);
      }

      // Generate flightpath if applicable, and rotate the feature toward the next valid waypoint
      if (!isEmpty(feature.getProperties()["flightpath"]))
      {
        /**
         * Retrieve key/value pairs from flightpath
         */
        // Get [lat, long] from flightpath
        let getCoordsFromFlightpath = (function() {
          function returnCoordinates(array) {
            let coordinates = [];
            array.forEach(element => coordinates.push([element.longitude, element.latitude]));
            return coordinates;
          }

          return returnCoordinates; // getCoordsFromFlightpath is now function returnCoordinates(...)
        })();

        // Get time from flightpaths
        let getPropFromFlightpath = (function() {
          function returnProp(array, prop) {
            let props = [];
            array.forEach(element => props.push(element[prop]));
            return props;
          }

          return returnProp;
        })();

        // Calculate the flightpaths from feature origin to its next waypoint
        let currentLoc = [toLonLat(feature.getGeometry().getCoordinates())];
        let flightpathProps = feature.getProperties()["flightpath"];
        let flightpathCoords = currentLoc.concat(getCoordsFromFlightpath(flightpathProps));
        // console.log(getPropFromFlightpath(flightpathProps, 'altitude'));
        // console.log(getPropFromFlightpath(flightpathProps, 'time'));
        
        // Create a LineString representing the flightpath and style it
        let flightPath = new LineString(flightpathCoords);
        let flightPathFeature = createFlightpathFeature(flightPath, 'red');

        // Calculate the image rotation based on its trajectory
        let nextCoord = flightpathCoords[1];
        let delta_x = nextCoord[0] - currentLoc[0][0]; // currentLoc is an Array object, so deference it first
        let delta_y = nextCoord[1] - currentLoc[0][1];
        // console.log("x: " + delta_x + " y: " + delta_y);
        // console.log("radians: " + Math.atan2(delta_y, delta_x));
        let rotation = Math.atan2(delta_y, delta_x); // use atan2 to get the angle between positive x-axis

        // Rotate the image
        let image = feature.getStyle()[0].getImage();
        image.setRotation(Math.PI/2 - rotation);
        image.setRotateWithView(true);

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
      console.log(feature);
    })
  })
  /**
   * Updates the GUI if needed, which sits on top of the OpenLayers
   */
  .then(function(){
    // Update the info section
    let info = document.getElementById("info");
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
  // Convert parameters to string if needed
  bottomText = String(bottomText);
  topText = String(topText);

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
      if (/*model*/ true) {
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

/**
 * Initialize the map, including map layers and interactions
 */
var map1 = new Map({
  controls: defaultControls().extend([
    mousePositionControl,
    new FullScreen(),
  ]),
  controls: defaultControls({
    attribution: false,
    zoom: false,
    rotate: false
  }),
  interactions: defaultInteractions({doubleClickZoom: false}),
  target: 'map1',
  view: new View({
    center: [0, 0],//fromLonLat([-84.39, 33.77]),
    zoom: 5
  }),
  layers: [
    stamenLayer,
  ]
});


/**
 * Finalize map generation
 */ 
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
/*setInterval(function() {
  r = r % (Math.PI * 2) + Math.PI / 100;
  map1.getView().setRotation(r);
  // console.log(map1.getView().getRotation());
  let coord = fromLonLat([-84.40070629119873,
    33.76908954476728]);
  map1.getView().setCenter(coord);
}, 1000)*/