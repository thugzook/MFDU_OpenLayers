var fs = require('fs');
var balsaMsg = require('./balsa_pb');

var util= require('util');
var enc = new util.TextEncoder('utf-8');

var udp = require('dgram');

var count = 0;

// --------------------creating a udp server --------------------

// creating a udp server
var server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error',function(error){
  console.log('Error: ' + error);
  server.close();
});

// emits on new datagram msg
server.on('message',function(msg,info){
  console.log('Data received from client');
  var allInfo = new balsaMsg.AllInfo();  //how to create GPB obj, not needed here but as a ref
  
  // Convert UDP msg to json using GPB
  var decoded = proto.balsa.AllInfo.deserializeBinary(msg);
  var decodedObj = proto.balsa.AllInfo.toObject(false, decoded);
  
  //mfduJson will be json output for map, created with GPB json
  var mfduJson = {"type":"FeatureCollection"};
  mfduJson.features = new Array();
  for (const x in decodedObj.multiviList) {
    console.log('Vehicle');
    var newJsonObj = {"type":"Feature"};
    
    var propertiesJsonObj = {};
    propertiesJsonObj.id = decodedObj.multiviList[x].droneNum;
    propertiesJsonObj.alt = decodedObj.multiviList[x].flightpathList[0].altitude;
    if (decodedObj.multiviList[x].droneNum == 0) {
      propertiesJsonObj.plat = "HELICOPTER";
    } else {
      propertiesJsonObj.plat = "DRONE";
    }
    propertiesJsonObj.flightpath = new Array();
    for (const y in decodedObj.multiviList[x].flightpathList) {
      if (decodedObj.multiviList[x].flightpathList[y].valid) {
        console.log('   waypoint');
        var coords = {};
        coords.time = decodedObj.multiviList[x].flightpathList[y].time;
        coords.altitude = decodedObj.multiviList[x].flightpathList[y].altitude;
        coords.latitude = decodedObj.multiviList[x].flightpathList[y].latitude;
        coords.longitude = decodedObj.multiviList[x].flightpathList[y].longitude;
        propertiesJsonObj.flightpath[y] = coords;
      } else {
        console.log('not working');
      }
    }
    propertiesJsonObj.velocity = decodedObj.multiviList[x].velocity;
    propertiesJsonObj.positionCovariance = decodedObj.multiviList[x].positionCovarianceList;
    propertiesJsonObj.positionCovarianceType = decodedObj.multiviList[x].positionCovarianceType;
    propertiesJsonObj.velocityCovariance = decodedObj.multiviList[x].velocityCovarianceList;
    propertiesJsonObj.velocityCovarianceType = decodedObj.multiviList[x].velocityCovarianceType;
    
    var geometryJsonObj = {"type": "Point"};
    geometryJsonObj.coordinates = new Array();
    geometryJsonObj.coordinates[0] = decodedObj.multiviList[x].flightpathList[0].altitude;
    geometryJsonObj.coordinates[1] = decodedObj.multiviList[x].flightpathList[0].latitude;
    geometryJsonObj.coordinates[2] = decodedObj.multiviList[x].flightpathList[0].longitude;
    
    newJsonObj.properties = propertiesJsonObj;
    newJsonObj.geometry = geometryJsonObj;
    mfduJson.features[x] = newJsonObj;
  }
  
  // Write out json files
  var mfduJsonStringed = JSON.stringify(mfduJson);
  const mfduName = "mfduJsons/mfduJson" + count + ".geojson";
  fs.writeFile(mfduName, mfduJsonStringed, function(err) {
    if (err) {
        console.log(err);
    }
  });
  fs.writeFile("mfduJsons/mfduJson.geojson", mfduJsonStringed, function(err) {
    if (err) {
        console.log(err);
    }
  });
  
  var allInfoJson = JSON.stringify(decodedObj);
  const receivedName = "mfduJsons/myReceivedJson" + count + ".json";
  fs.writeFile(receivedName, allInfoJson, function(err) {
    if (err) {
        console.log(err);
    }
  });
  count = count + 1;
  

//sending msg
server.send(msg,info.port,'127.0.0.1',function(error){ // 192.168.1.160 # 10.80.12.194
  if(error){
    client.close();
  }else{
    console.log('Data sent !!!');
  }

});

});

//emits when socket is ready and listening for datagram msgs
server.on('listening',function(){
  var address = server.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log('Server is listening at port' + port);
  console.log('Server ip :' + ipaddr);
  console.log('Server is IP4/IP6 : ' + family);
});

//emits after the socket is closed using socket.close();
server.on('close',function(){
  console.log('Socket is closed !');
});

server.bind(20001);

//setTimeout(function(){
//server.close();
//},8000);