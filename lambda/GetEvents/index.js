const AWS = require('aws-sdk');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();



exports.handler = (event, context, callback) => {
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    dynamo.scan({ TableName: process.env.DYNAMODB_EVENTS_TABLE }, done);
};