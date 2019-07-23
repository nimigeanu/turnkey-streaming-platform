var response = require('cfn-response');

exports.handler = (event, context) => {
console.log('REQUEST:: ', JSON.stringify(event, null, 2));
var responseData = {
  ID: Math.random().toString(36).substring(7) + new Date().getTime().toString(36)
};
console.log("responseData: ", responseData);
response.send(event, context, response.SUCCESS, responseData);
};