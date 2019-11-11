# Turnkey Live Streaming Platform with Recording and VOD

## Overview
The video streaming architecture has been created for occasional broadcasting of webinar events. Individual events are recorded, then automatically processed and made available as Video On Demand.

## Features:
* One-to-many live streaming
* VOD Streaming of previously recorded Live Events
* Built entirely on top of the AWS platform
* Streaming powered by AWS Elemental
* RTMP broadcast
* HLS playback with Adaptive Bitrate - for both live and VOD
* CDN delivery
* API Driven - can be integrated into any CMS

## Setup

### Deploying the architecture

1. Sign in to the [AWS Management Console](https://aws.amazon.com/console), then click the button below to launch the CloudFormation template. Alternatively you can [download](template.yaml) the template and adjust it to your needs.

[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=simple-video-sharing-platform&templateURL=https://s3.amazonaws.com/lostshadow/turnkey-streaming-platform/template.yaml)

2. Choose a name for your stack
3. Check the `I acknowledge that AWS CloudFormation might create IAM resources box`. This confirms you agree to have some required IAM roles and policies created by CloudFormation.
4. Hit the `Create` button. 
5. Wait for the `Status` of your CloudFormation template to become `CREATE_COMPLETE`. Note that this may take **10 minutes** or more.
6. Under `Outputs`, notice the keys named `ApiEndpoint`, `RtmpDestination`, `LiveCdnHost` and `VodCdnHost`; write these down for later use

#### Notes:
* The solution uses AWS Elemental MediaLive, MediaStore and MediaConvert, which are available in specific AWS Regions only. Therefore, you must deploy it in a region that supports the services.

### Testing your setup

1. Call the following API URL (use browser, Postman, CURL etc) to start a new event:
		GET {ApiEndpoint}/events/start
	...be sure to replace {ApiEndpoint} with the value output by CloudFormation above (step 6)
	
	Repeat the call until the `State` of the response becomes `RUNNING` (it will at first show up as `STARTING`)

3. Point your RTMP broadcaster (any of [these](https://support.google.com/youtube/answer/2907883) will work) to the `RtmpDestination` output by CloudFormation above (step 6) and start streaming

	Note that, while some RTMP broadcasters require a simple URI, others (like [OBS Studio](https://obsproject.com)) require a **Server** and **Stream key**. In this case, split the `RtmpDestination` above at the last *slash* character, as following:
	
	**Server**: `rtmp://{IP}:1935/urbanstarburst`  
	**Stream key**: `stream1`

4. Compose your live video URL as following
		https://{LiveCdnHost}/A.m3u8
	...be sure to replace {LiveCdnHost} with the value output by CloudFormation above

5. Test your video URL in your favorite HLS player or player tester. You may use [this one](https://video-dev.github.io/hls.js/demo/) if not sure

6. Call the following API URL (use browser, Postman, CURL etc) to stop the event:
		GET {ApiEndpoint}/events/stop
	...be sure to replace {ApiEndpoint} with the value output by CloudFormation above

6. Call the following API URL (use browser, Postman, CURL etc) to list your events:
		GET {ApiEndpoint}/events
	...be sure to replace {ApiEndpoint} with the value output by CloudFormation above

	You should notice a new event in the `Items` JSON list. Write down its `ID` as `EventID`. 

	Repeat the API call until its `TranscodeStatus` becomes `complete` (it will pass through states `recording` and `processing`)

7. Compose your live video URL as following
		https://{VodCdnHost}/A/event_{EventID}.m3u8
	...be sure to replace {VodCdnHost} with the value output by CloudFormation above and {EventID} with the value output by the API in the previous step

8. Test your video URL in your favorite HLS player or player tester. You may use [this one](https://developer.jwplayer.com/tools/stream-tester/) if you don't have a favorite yet

9. (Optional) Call the following API URL (use Postman, CURL etc) to list your events:
		DELETE {ApiEndpoint}/events/{EventID}
	...be sure to replace {ApiEndpoint} with the value output by CloudFormation above and {EventID} with the value output by the API in step 6

### Integration
As this has been created without prior knowledge of the context it will be deployed in, it should be fairly straightforward to integrate anywhyere. You may fully query and control the system via the API. 

A very simple operation demo has been included [here](test/index.html). It deals with starting and stopping events, listing recordings, and playing back live and VOD feeds. Be sure to replace the API and CDN specific variables (lines 24-36) with your own before trying it.


### Shortcomings

* Setup creates a single live channel, therefore you cannot broadcast simultaneous multiple events out of the box. It can be easily duplicated (just launch the stack multiple times under different names) to accomplish that, however if you need a dynamic number of channels, some refactoring will be required
* A simple ABR profile has been chosen for both live and recordings. It features just 2 quality settings (240p and 720p) thus being affordable in terms of AWS costs. You will need to alter the MediaLive output group settings and/or the MediaConvert template if you need a full spectrum (or just different) ABR setup
* The stack creates a MediaLive channel/input pair that will incur AWS costs even when idle ($0.01/h); additional effort is required to terminate and relaunch these on demand; this would also lead to the broadcast URL (the 'rtmp://') being different on every run
* Polling the API is required for some operations:
  * waiting for the live channel to be ready for broadcast
  * waiting for a recorded event to be ready for playback
  
  A direct feedback (as-soon-as-ready notification) can be implemented via CloudWatch and/or SNS, however not included in this solution
