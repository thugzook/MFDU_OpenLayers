
# MFDU_OpenLayers
Dependencies
* proj4 - used for WGS84 projection coordinate transformations
* google protobuf
* nodemon - used to detect static file changes and re-serve them
* express
* parcel

Uses Parcel to host an OpenLayers application. Serve static .geoJson files from an express server. Receive FACE compliant geographical data through a google protobuf server and parse locally using OpenLayers/Js.
![MFDU](documentation/images/mfduServer.png)

## Servers
* OpenLayers Parcel server
* Static vector file server (`serveStatic.js`)
* UDP packet sender (`clientSendGPB.py`)
* UDP packet receiver (`myServer.js`)
The minimum servers needed to run the MFDU is the OpenLayers Parcel server and the static vector file server.

## OpenLayers + Parcel
To run OpenLayers (available at http://localhost:1234):

    npm start

To generate a build ready for production:

    npm run build

## Static Vector File Server

OpenLayers processes `.geoJson` files. Read more [here](https://geojson.org/).

To run the static vector file server:

    nodemon serveStatic.js

This will make files at `/public` locally accessible at http://localhost:3000. An example API call:

    fetch('http://localhost:3000/dir/test.geoJson', {mode: 'cors'})

## UDP packet sender/receiver
Run the UDP receiver with command:

    nodemon myServer.js

Send UDP packets with command:

    py clientSendGPB.py

UDP packets are then generated locally at `/mfduJsons`