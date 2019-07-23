const AWS = require('aws-sdk');
const doc = require('dynamodb-doc');
var dynamo = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = function(event, context, callback) {
  
  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? err.message : JSON.stringify(res),
    headers: {
      'Content-Type': 'application/json',
       'Access-Control-Allow-Origin' : '*'
    },
  });
  
  let eventId = event.pathParameters.eventId;
  console.log("env: ", process.env)
  console.log("eventId: ", eventId);
  deleteFiles(eventId, done);
};


function deleteFiles(eventId, callback){
  console.log("deleteFiles: " + eventId)
  
  var deleteParams = {Bucket: process.env.S3_BUCKET};
  deleteParams.Delete = {Objects:[]};
    
  s3.listObjects({Bucket: process.env.S3_BUCKET, Prefix: 'hls/A/event_' + eventId}, function(err, data) {
    if (err) return callback(err);
    console.log("data: ", data)
    //if (data.Contents.length == 0) callback();
      data.Contents.forEach(function(content) {
      deleteParams.Delete.Objects.push({Key: content.Key});
    });
    s3.listObjects({Bucket: process.env.S3_BUCKET, Prefix: 'archive/A/event_' + eventId}, function(err, data) {
      if (err) return callback(err);
      console.log("data: ", data)
      //if (data.Contents.length == 0) callback();
      
      data.Contents.forEach(function(content) {
        deleteParams.Delete.Objects.push({Key: content.Key});
      });
      console.log("deleteParams: ", deleteParams)
      if (deleteParams.Delete.Objects.length > 0){
        s3.deleteObjects(deleteParams, function(err, data) {
          if (err) return callback(err);
          //if(data.Contents.length == 1000)emptyBucket(bucketName,callback);
          else deleteRecord(eventId, callback)
        });
      }
      else deleteRecord(eventId, callback);
    });
  });
}

function deleteRecord(eventId, callback){
  console.log("deleteRecord: " + eventId);
  var params = {
    TableName:process.env.DYNAMODB_EVENTS_TABLE,
    "Key" : {
        "ID": eventId
    }
  };
  
  console.log("Attempting a conditional delete: ", params);
  dynamo.delete(params, callback);
}