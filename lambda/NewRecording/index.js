const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const doc = require('dynamodb-doc');
const ddb = new doc.DynamoDB();

const MEDIA_CONVERT_ENDPOINT = process.env.MEDIA_CONVERT_ENDPOINT;
const MEDIA_CONVERT_ROLE_ARN = process.env.MEDIA_CONVERT_ROLE_ARN;
const JOB_TEMPLATE = process.env.JOB_TEMPLATE;
const OUTPUT_LOCATION = process.env.OUTPUT_LOCATION;
const DYNAMODB_EVENTS_TABLE = process.env.DYNAMODB_EVENTS_TABLE;

const mediaConvert = new AWS.MediaConvert({endpoint: MEDIA_CONVERT_ENDPOINT});

exports.handler = function(event, context, callback) {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  
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
              moveFile(srcBucket, srcKey, id, callback);
          }
      }
  });
};

function moveFile(srcBucket, srcKey, id, callback){
  console.log("moveFile: " + srcBucket + "  " + srcKey);
  const fileInput = `s3://${srcBucket}/${srcKey}`;
  console.log("fileInput: " + fileInput);
  
  //copy the file to the archive folder
  var s3 = new AWS.S3();
  let simpleKey = srcKey.replace(/recording\//, "");
  let fileName = `event_${id}.ts`;
  let copyDestination = `archive/${simpleKey}`;
  copyDestination = copyDestination.replace(/video_1.[0-9]+.ts/, fileName);
  console.log("simpleKey: " + simpleKey);
  console.log("copyDestination: " + copyDestination);
  s3.copyObject({
    Bucket: srcBucket,
    Key: copyDestination,
    CopySource: encodeURIComponent(srcBucket + '/' + srcKey),
    MetadataDirective: 'COPY'
  }, function (err, data) {
    if (err) {
        console.log("Error copying" );
        console.log(err, err.stack); // an error occurred
        callback(`Error copying '${fileInput}' to '${copyDestination}`);
    } else {
      console.log("copied");
      
      s3.deleteObject({
        Bucket: srcBucket,
        Key: srcKey
      }, function(err, data) {
        if (err) console.log(err, err.stack); 
        else {
          console.log("deleted");
          launchTranscoder(`s3://${srcBucket}/${copyDestination}`, callback);
        }
      });
      
    }
  });
  
}

function launchTranscoder(fileInput, callback){
  console.log("launchTranscoder: " + fileInput);
  const params = {
    JobTemplate: JOB_TEMPLATE,
    Role: MEDIA_CONVERT_ROLE_ARN,
    Settings: {
      Inputs: [
        {
          FileInput: fileInput,
        },
      ],
    },
  };

  
  let fileName = fileInput.match(/archive\/([A-Z]\/event_([0-9]+)).ts/);
  console.log("fileName: " + fileName);
  console.log("fileName0: " + fileName[0]);
  console.log("fileName1: " + fileName[1]);
  let output = `${OUTPUT_LOCATION}/${fileName[1]}`;
  console.log("output: " + output);
  params.Settings.OutputGroups = [
    {
      Outputs: [],
      OutputGroupSettings: {
        "Type": "HLS_GROUP_SETTINGS",
        "HlsGroupSettings": {
          "SegmentLength": 10,
          "MinSegmentLength": 0,
          "Destination": output
        }
      },
    },
  ];
  
  
  mediaConvert.createJob(params).promise()
  .then((result) => {
    let message = 'Transcode job created.';
    console.log(message);
    console.log(result)
    let jobId = result.Job.Id;
    console.log("jobId: " + jobId);
    setupDatabase(fileName[2], jobId, callback);
  })
  .catch((err) => {
    let message = `Unable to transcode input at ${fileInput} due to an error: ${err}`;
    console.error(message);
    callback(null, message);
  });
  
};

/*
  let item = {
    "TableName": DYNAMODB_EVENTS_TABLE,
    "Item": {
        "ID": fileName,
        "TranscodeJob": transcodeJobId,
        "TranscodeStatus": 'processing',
        "Time": new Date().toGMTString()
    }
  }
  dynamo.putItem(item, function (err, data) {
    if (err) {
        console.log("Error adding item to DB" );
        console.log(err, err.stack); // an error occurred
    } else {
      callback(null, data);
    }
  });
}
*/
function setupDatabase(id, transcodeJobId, callback){
  console.log("setupDatabase: " + id);

  var params = {
    TableName:process.env.DYNAMODB_EVENTS_TABLE,
    
    Key: {
      "ID": id
    },
    
    UpdateExpression: "set TranscodeJob = :transcodejob, TranscodeStatus = :trasnscodestatus",
    ExpressionAttributeValues: {
        ":transcodejob": transcodeJobId, 
        ":trasnscodestatus": "processing"
    },
    ReturnValues:"UPDATED_NEW"
  };
  
  dynamo.update(params, function(err, data) {
    if (err) {
        console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        callback(err);
    } else {
        console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        
        callback(null, data);
    }
  });
}