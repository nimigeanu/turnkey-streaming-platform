const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const doc = require('dynamodb-doc');
const ddb = new doc.DynamoDB();


exports.handler = (event, context, callback) => {
    
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
             'Access-Control-Allow-Origin' : '*'
        },
    });
    
    var medialive = new AWS.MediaLive();
    var params = {
        ChannelId: process.env.MEDIALIVE_CHANNEL_ID
    };
    
    if (event.path.match(/.*events\/start/)){
        var metadata = "undefined";
        if (event.queryStringParameters){
            if (event.queryStringParameters.metadata){
                metadata = event.queryStringParameters.metadata;
            }
        }
        setupEvent(metadata, done);
    }
    else if (event.path.match(/.*events\/stop/)){
        medialive.stopChannel(params, done);
    }
};

function startChannel(callback){
    var medialive = new AWS.MediaLive();
    var params = {
        ChannelId: process.env.MEDIALIVE_CHANNEL_ID
    };
    medialive.startChannel(params, callback);
}

function setupEvent(metadata, callback){
  var params = {
    TableName : process.env.DYNAMODB_EVENTS_TABLE,
    IndexName: "TranscodeJob-index",
    KeyConditionExpression: "#tj = :tid",
    ExpressionAttributeNames:{
        "#tj": "TranscodeJob"
    },
    ExpressionAttributeValues: {
        ":tid": "-1"
    }
  };
  
  dynamo.query(params, function(err, data) {
      if (err) {
          console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
          console.log("Query succeeded.");
          console.log(data);
          if (data.Count > 0){
              let id = data.Items[0].ID;
              console.log("Id: " + id);
              updateItem(id, metadata, callback)
          }
          else {
              insertItem(metadata, callback)
          }
      }
  });
}

function insertItem(metadata, callback){
    console.log("insertItem: " + metadata)
    let timestamp = new Date().getTime().toString();
    let item = {
    "TableName": process.env.DYNAMODB_EVENTS_TABLE,
    "Item": {
        "ID": timestamp,
        "TranscodeJob": "-1",
        "TranscodeStatus": 'recording',
        "Time": new Date().toGMTString(), 
        "metadata": metadata
    }
  }
  ddb.putItem(item, function (err, data) {
    if (err) {
        console.log("Error adding item to DB" );
        console.log(err, err.stack); // an error occurred
    } else {
      startChannel(callback)
    }
  });
}

function updateItem(id, metadata, callback){
  console.log("updateItem: " + metadata)
  var params = {
    TableName:process.env.DYNAMODB_EVENTS_TABLE,
    
    Key: {
      "ID": id
    },
    
    UpdateExpression: "set metadata = :metadata",
    ExpressionAttributeValues: {
        ":metadata": metadata
    },
    ReturnValues:"UPDATED_NEW"
  };
  
  dynamo.update(params, function(err, data) {
    if (err) {
        console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        callback(err);
    } else {
        console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        startChannel(callback);
    }
  });
}