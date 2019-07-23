var AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

console.log("dynamo: " + dynamo)

exports.handler = function(event, context, callback) {
  let jobId = event.detail.jobId;
  console.log("jobId: " + jobId);
  let status = event.detail.status;
  
  var params = {
    TableName : process.env.DYNAMODB_EVENTS_TABLE,
    IndexName: "TranscodeJob-index",
    KeyConditionExpression: "#tj = :tid",
    ExpressionAttributeNames:{
        "#tj": "TranscodeJob"
    },
    ExpressionAttributeValues: {
        ":tid": jobId
    }
  };
  
  dynamo.query(params, function(err, data) {
      if (err) {
          console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
          console.log("Query succeeded.");
          console.log(data);
          updateStatus(data.Items[0].ID, status, callback)
      }
  });
}

function updateStatus(id, status, callback){
  console.log("updateStatus: " + id);
  var params = {
    TableName:process.env.DYNAMODB_EVENTS_TABLE,
    
    Key: {
      "ID": id
    },
    
    UpdateExpression: "set TranscodeStatus = :status",
    ExpressionAttributeValues: {
        ":status": status.toLowerCase()
    },
    ReturnValues:"UPDATED_NEW"
  };
  
  dynamo.update(params, function(err, data) {
    if (err) {
        console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        callback(err);
    } else {
        console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        
        callback(null, data)
    }
  });
};