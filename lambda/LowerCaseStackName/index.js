var response = require('cfn-response');

exports.handler = (event, context) => {
	console.log('REQUEST:: ', JSON.stringify(event, null, 2));
	var responseData = {name:process.env.STACK_NAME.toLowerCase()};
	console.log("responseData: ", responseData);
	response.send(event, context, response.SUCCESS, responseData);
};