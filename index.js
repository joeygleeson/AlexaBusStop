/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a sample skill built with Amazon Alexa Skills nodejs
 * skill development kit.
 * This sample supports multiple languages (en-US, en-GB, de-GB).
 * The Intent Schema, Custom Slot and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-howto
 **/

'use strict';
const Alexa = require('alexa-sdk');
const APP_ID = 'amzn1.ask.skill.806ce2d2-e31b-43a7-b708-d949824cfa51'; // TODO replace with your app ID (OPTIONAL).
var _ = require("underscore");
var https = require('https');
var util = require('util');
var NodeGeocoder = require('node-geocoder');

const AlexaDeviceAddressClient = require('./AlexaDeviceAddressClient');
const Messages = require('./Messages');

const ALL_ADDRESS_PERMISSION = "read::alexa:device:all:address";

const PERMISSIONS = [ALL_ADDRESS_PERMISSION];

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'London Bus',
            RETURN_MESSAGE: 'You asked for Route <say-as interpret-as="digits">%s</say-as>',
            SUCCESS_RETURN_MESSAGE: 'The next %s <say-as interpret-as="digits">%s</say-as> bus is due %s at %s',
            WELCOME_MESSAGE: "Welcome to %s. You can ask me for bus arrival information for stops nearby",
            WELCOME_REPROMT: 'For instructions on what you can say, please say help me.',
            HELP_MESSAGE: 'You can ask questions such as, when is the next <say-as interpret-as="digits">137</say-as> bus, or, you can say exit...Now, what can I help you with?',
            HELP_REPROMT: 'You can say things like, when is the next <say-as interpret-as="digits">137</say-as> bus, or you can say exit...Now, what can I help you with?',
            STOP_MESSAGE: 'Goodbye!',
        },
    }
};

const GEOCODE_APP_KEY = 'AIzaSyD9eJKVNGjc1Rm4e4fZ7JAs_rWMXSE7TLA';

function getStopsForRoute(self, lat, long, routeNumber, routeDirection)
{
    let speechOutput = self.t('RETURN_MESSAGE', routeNumber);
    let successSpeechOutput = self.t('SUCCESS_RETURN_MESSAGE');
    
    var options = {
        host: 'api.tfl.gov.uk',
        path: '/Stoppoint?lat=' + lat + '&lon=' + long + '&stoptypes=NaptanPublicBusCoachTram&radius=400',
        headers: {'User-Agent': 'request'}
    };

    console.log("Getting stops for location: lat=" + lat + ", lon=" + long);
    https.get(options, function(res) {
        var body = '';

        res.on('data', function(chunk){
            body += chunk;
        });

        res.on('end', function(){
            console.log("Got stops body: " + body);
            var data = JSON.parse(body);

            if(data.stopPoints.length == 0)
            {
                speechOutput = "Could not find any stops nearby";
                console.log(speechOutput);
                self.emit(':tell', speechOutput); 
                return;
            }
            
            var stopsForRoute = _.filter(data.stopPoints, function(stopElement){
                var matchingLines = _.filter(stopElement.lines, function(lineElement){
                    return lineElement.name == routeNumber;
                });
                
                var hasRoute = matchingLines.length > 0;
                var isMatchingDirection = true;

                if(routeDirection != undefined)
                {
                    var compassPointProperties = _.filter(stopElement.additionalProperties, function(additionalProperty){
                        return additionalProperty.key == "CompassPoint";
                    });
                    if(compassPointProperties.length == 1)
                    {
                        var lineDirection = compassPointProperties[0].value;
                        isMatchingDirection = routeDirection[0].toLowerCase() == lineDirection[0].toLowerCase();
                        console.log("Checking stop %s for matching direction: %s = %s %s", stopElement.stopLetter, routeDirection[0].toLowerCase(),  lineDirection[0].toLowerCase(), isMatchingDirection);
                    }
                }

                return hasRoute && isMatchingDirection;
            });

            if(stopsForRoute.length == 0)
            {
                speechOutput = util.format("Could not find any stops nearby for route %s", routeNumber);
                console.log(speechOutput);
                self.emit(':tell', speechOutput); 
                return;
            }

            console.log("Found %s Stops for route: %s", stopsForRoute.length, routeNumber);
            var closestStop = stopsForRoute[0];
            console.log("Closest Stop: " + JSON.stringify(closestStop));
            
            if(closestStop == undefined)
            {
                speechOutput = "Could not find any stops nearby";
                console.log(speechOutput);
                self.emit(':tell', speechOutput); 
                return;
            }
            var options = {
                host: 'api.tfl.gov.uk',
                path: '/Stoppoint/' + closestStop.id + '/Arrivals?mode=bus',
                headers: {'User-Agent': 'request'}
            };
            https.get(options, function(res) {
                var body = '';

                res.on('data', function(chunk){
                    body += chunk;
                });

                res.on('end', function(){
                    console.log("Got arrivals: " + body);
                    var data = JSON.parse(body);
                    var stopName = closestStop.commonName + ", Stop " + closestStop.stopLetter;
                    
                    var predictionsForLine = _.filter(data, function(prediction){
                        return prediction.lineName == routeNumber;
                    });

                    if(predictionsForLine == undefined)
                    {
                        speechOutput = "Could not find any arrivals for " + stopName;
                        console.log(speechOutput);
                        self.emit(':tell', speechOutput); 
                        return;
                    }

                    var sortedPredictions = _.sortBy(predictionsForLine, function(line){return line.timeToStation;});
                    var nextArrival = sortedPredictions[0];
                    var mins = Math.floor(nextArrival.timeToStation/60);
                    var due = mins === 0 ? 'Now' : mins == 1 ? 'in ' + mins + ' minute' : 'in ' + mins + ' minutes'; 
                    var direction = routeDirection == undefined ? "" : routeDirection;
                    speechOutput = util.format(successSpeechOutput, direction, routeNumber, due, stopName);
                    console.log(speechOutput);
                    self.emit(':tell', speechOutput); 
                });
            }).on('error', function(e) {
                console.log("Got error fetching arrivals: " + e.message);
                speechOutput = 'error getting data' + e;
                //this.attributes.error = e;
                console.log(speechOutput);
                self.emit(':tell', speechOutput); 
            });
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        speechOutput = 'error getting data' + e;
        //this.attributes.error = e;
        console.log(speechOutput);
        self.emit(':tell', speechOutput); 
    });

}


const handlers = {
    'LaunchRequest': function () {
        this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'));
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        this.attributes.repromptSpeech = this.t('WELCOME_REPROMT');
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
    'ArrivalsIntent': function () {
        const self = this;
        console.log('event: ' + JSON.stringify(this.event));

        const routeNumberSlot = this.event.request.intent.slots.RouteNumber;
        let routeNumber;
        if (routeNumberSlot && routeNumberSlot.value) {
            routeNumber = routeNumberSlot.value.toLowerCase();
            console.log("Found RouteNumber Slot: " + routeNumber);
        }
        else
        {
            console.log("Could not determine RouteNumber Slot value");
            this.emit(':tell', "I don't know what bus number you said");
            return;
        }
        
        const routeDirectionSlot = this.event.request.intent.slots.Direction;
        let routeDirection;
        if (routeDirectionSlot && routeDirectionSlot.value) {
            routeDirection = routeDirectionSlot.value.toLowerCase();
            console.log("Found RouteDirection Slot: " + routeDirection);
        }
        else
        {
            console.log("Could not determine RouteDirection Slot value");
        }

        let speechOutput = this.t('RETURN_MESSAGE', routeNumber);
        let successSpeechOutput = this.t('SUCCESS_RETURN_MESSAGE');

        //var lat = '51.468557';
        //var long = '-0.151273';

        var consentToken = undefined;
        var deviceId = undefined;;
        var apiEndpoint = undefined;

        if(this.event.context == undefined)
        {
            console.log("No DeviceId and ConsentToken provided in request. Aborting");
            this.emit(':tell', Messages.ERROR);
            return;
        }
        
        consentToken = this.event.context.System.user.permissions.consentToken;
        deviceId = this.event.context.System.device.deviceId;
        apiEndpoint = this.event.context.System.apiEndpoint;

        // If we have not been provided with a consent token, this means that the user has not
        // authorized your skill to access this information. In this case, you should prompt them
        // that you don't have permissions to retrieve their address.
        if(!consentToken) {
            this.emit(":tellWithPermissionCard", Messages.NOTIFY_MISSING_PERMISSIONS, PERMISSIONS);

            // Lets terminate early since we can't do anything else.
            console.log("User did not give us permissions to access Device Location.");
            return;
        }
        else
        {
            console.log("User has give permission to access Device Loacation. Requesting...");
        }

        const alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);
        let deviceAddressRequest = alexaDeviceAddressClient.getFullAddress();

        deviceAddressRequest.then((addressResponse) => {
            switch(addressResponse.statusCode) {
                case 200:
                    console.log("Address successfully retrieved, now responding to user.");
                    const address = addressResponse.address;

                    var options = {
                      provider: 'google',
                      httpAdapter: 'https', // Default 
                      apiKey: GEOCODE_APP_KEY, // for Mapquest, OpenCage, Google Premier 
                      formatter: null         // 'gpx', 'string', ... 
                    };
                     
                    var geocoder = NodeGeocoder(options);
                    var searchAddress = address['addressLine1'] + ' ' + address['postalCode'];
                    
                    // Using callback 
                    geocoder.geocode(searchAddress, function(err, res) {
                        console.log(res);
                        
                        if(res != undefined && res[0] != undefined && res[0].latitude != undefined && res[0].longitude != undefined){
                            console.log("Successfully found geocode information for device location");
                            getStopsForRoute(self, res[0].latitude, res[0].longitude, routeNumber, routeDirection);
                        }
                        else
                        {
                            console.log("Error getting geocode information for address: " + err);
                            this.emit(":tell", Messages.NO_GEOCODE_ADDRESS);
                        }
                    });
                        
                    break;
                case 204:
                    // This likely means that the user didn't have their address set via the companion app.
                    console.log("Successfully requested from the device address API, but no address was returned.");
                    this.emit(":tell", Messages.NO_ADDRESS);
                    break;
                case 403:
                    console.log("The consent token we had wasn't authorized to access the user's address.");
                    this.emit(":tellWithPermissionCard", Messages.NOTIFY_MISSING_PERMISSIONS, PERMISSIONS);
                    break;
                default:
                    this.emit(":ask", Messages.LOCATION_FAILURE, Messages.LOCATION_FAILURE);
            }

            console.info("Ending getAddressHandler()");
        });

        deviceAddressRequest.catch((error) => {
            this.emit(":tell", Messages.ERROR);
            console.error(error);
            console.info("Ending getAddressHandler()");
        });

        
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMT');
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'AMAZON.CancelIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'Unhandled': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
