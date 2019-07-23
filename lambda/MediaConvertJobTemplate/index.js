var response = require('cfn-response');
const AWS = require('aws-sdk');

var createParams = {
  "Name": "${AWS::StackName}-Template",
  "Settings": {
    "OutputGroups": [
      {
        "CustomName": "${AWS::StackName}-HLS",
        "Name": "Apple HLS",
        "Outputs": [
          {
            "Preset": "System-Avc_16x9_270p_14_99fps_400kbps",
            "NameModifier": "_240p"
          },
          {
            "Preset": "System-Avc_16x9_720p_29_97fps_3500kbps",
            "NameModifier": "_720p"
          }
        ],
        "OutputGroupSettings": {
          "Type": "HLS_GROUP_SETTINGS",
          "HlsGroupSettings": {
            "ManifestDurationFormat": "INTEGER",
            "SegmentLength": 10,
            "TimedMetadataId3Period": 10,
            "CaptionLanguageSetting": "OMIT",
            "Destination": "s3://${StorageBucket}/hls",
            "TimedMetadataId3Frame": "PRIV",
            "CodecSpecification": "RFC_4281",
            "OutputSelection": "MANIFESTS_AND_SEGMENTS",
            "ProgramDateTimePeriod": 600,
            "MinSegmentLength": 0,
            //"MinFinalSegmentLength": 0,
            "DirectoryStructure": "SINGLE_DIRECTORY",
            "ProgramDateTime": "EXCLUDE",
            "SegmentControl": "SEGMENTED_FILES",
            "ManifestCompression": "NONE",
            "ClientCache": "ENABLED",
            "StreamInfResolution": "INCLUDE"
          }
        }
      }
    ],
    "AdAvailOffset": 0,
    "Inputs": [
      {
        "AudioSelectors": {
          "Audio Selector 1": {
            "Offset": 0,
            "DefaultSelection": "DEFAULT",
            "ProgramSelection": 1
          }
        },
        "VideoSelector": {
          "ColorSpace": "REC_601",
          //"Rotate": "DEGREE_0"
        },
        "FilterEnable": "AUTO",
        "PsiControl": "USE_PSI",
        "FilterStrength": 0,
        "DeblockFilter": "DISABLED",
        "DenoiseFilter": "DISABLED",
        "TimecodeSource": "EMBEDDED"
      }
    ]
  },
  //"StatusUpdateInterval": "SECONDS_60"
}

var deleteParams = {
  "Name": "${AWS::StackName}-Template"
}

exports.handler = (event, context) => {
    console.log(event.RequestType);
    var mediaconvert = new AWS.MediaConvert({endpoint: "${MediaConvertEndPoint.EndpointUrl}"});
    var data;
    switch (event.RequestType){
        case "Create":
            mediaconvert.createJobTemplate(createParams).promise()
            .then((data) => {
                console.log("success");
                console.log(data);           // successful response
                response.send(event, context, "SUCCESS", {});
            })
            .catch((err) => {
                console.log("failed");
                console.log(err, err.stack); // an error occurred
                response.send(event, context, 'FAILED');
            });
            break;
        case "Delete":
            mediaconvert.deleteJobTemplate(deleteParams).promise()
            .then((data) => {
                console.log(data);
                response.send(event, context, "SUCCESS", {});
            })
            .catch((err) => {
                console.log(err, err.stack); // an error occurred
                response.send(event, context, 'FAILED');
            });
            break;
        default:
            response.send(event, context, 'FAILED');
            break;
    }
    return data;
};