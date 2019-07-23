var response = require('cfn-response');
const AWS = require('aws-sdk');

exports.handler = (event, context) => {
  console.log('REQUEST:: ', JSON.stringify(event, null, 2));
  const mediaconvert = new AWS.MediaConvert();
  mediaconvert.describeEndpoints().promise()
  .then((data) => {
    var responseData = {
      EndpointUrl: data.Endpoints[0].Url,
    };
    console.log("responseData: ", responseData);
    response.send(event, context, response.SUCCESS, responseData);
  })
  .catch((err) => {
    console.log('ERROR:: ', err, err.stack);
    response.send(event, context, 'FAILED');
  });
};