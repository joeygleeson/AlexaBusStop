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

const TFL_APP_ID = 'f29d3624'
const TFL_APP_KEY = 'd4ed8ef5bb35dc961a8137e322a700bb' 
const GEOCODE_APP_KEY = 'AIzaSyD9eJKVNGjc1Rm4e4fZ7JAs_rWMXSE7TLA';

function getStopsForRoute(self, lat, long, routeNumber, routeDirection)
{
    let speechOutput = self.t('RETURN_MESSAGE', routeNumber);
    let successSpeechOutput = self.t('SUCCESS_RETURN_MESSAGE');
    
    var options = {
        host: 'api.tfl.gov.uk',
        path: `/Stoppoint?lat=${lat}&lon=${long}&stoptypes=NaptanPublicBusCoachTram&radius=800&app_id=${TFL_APP_ID}&app_key=${TFL_APP_KEY}`,
        headers: {'User-Agent': 'request'}
    };

    console.log(`Getting stops for location: lat=${lat},long=${long}`);
    https.get(options, function(res) {
        var body = '';

        res.on('data', function(chunk){
            body += chunk;
        });

        res.on('end', function(){
            console.log("Successfully retrieved stops information from TFL");
                    
            var data = JSON.parse(body);

            if(data.stopPoints.length == 0)
            {
                speechOutput = "Could not find any London Bus Stops nearby";
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
                        //console.log("Checking stop %s for matching direction: %s = %s %s", stopElement.stopLetter, routeDirection[0].toLowerCase(),  lineDirection[0].toLowerCase(), isMatchingDirection);
                    }
                }

                return hasRoute && isMatchingDirection;
            });

            if(stopsForRoute.length == 0)
            {
                speechOutput = `Could not find any stops nearby for route <say-as interpret-as="digits">${routeNumber}</say-as>`;
                console.log(speechOutput);
                self.emit(':tell', speechOutput); 
                return;
            }
            
            var closestStop = stopsForRoute[0];
            var stopName = closestStop.commonName + ", Stop " + closestStop.stopLetter;
                    
            console.log(`Found ${stopsForRoute.length} Stops for route: ${routeNumber}. Closest Stop: ${stopName}`);
            //console.log("Closest Stop: " + JSON.stringify(closestStop));
            
            var options = {
                host: 'api.tfl.gov.uk',
                path: `/Stoppoint/${closestStop.id}/Arrivals?mode=bus&app_id=${TFL_APP_ID}&app_key=${TFL_APP_KEY}`,
                headers: {'User-Agent': 'request'}
            };
            https.get(options, function(res) {
                var body = '';

                res.on('data', function(chunk){
                    body += chunk;
                });

                res.on('end', function(){
                    console.log(`Successfully retrieved arrivals information for stop: ${stopName}`);
                    var data = JSON.parse(body);
                    
                    var predictionsForLine = _.filter(data, function(prediction){
                        return prediction.lineName == routeNumber;
                    });

                    if(predictionsForLine == undefined)
                    {
                        speechOutput = `Could not find any arrival information for ${stopName}`;
                        console.log(speechOutput);
                        self.emit(':tell', speechOutput); 
                        return;
                    }

                    var sortedPredictions = _.sortBy(predictionsForLine, function(line){return line.timeToStation;});
                    var nextArrival = sortedPredictions[0];
                    var mins = Math.floor(nextArrival.timeToStation/60);
                    var due = mins === 0 ? 'Now' : mins == 1 ? `in ${mins} minute` : `in ${mins} minutes`; 
                    var direction = routeDirection == undefined ? "" : routeDirection;
                    speechOutput = util.format(successSpeechOutput, direction, routeNumber, due, stopName);
                    console.log(speechOutput);
                    self.emit(':tell', speechOutput); 
                });
            }).on('error', function(e) {
                console.log(`Error getting arrivals information from TFL API: ${e.message}`);
                self.emit(":tell", Messages.TFL_FAILURE);
            });
        });
    }).on('error', function(e) {
        console.log(`Error getting stops information from TFL API: ${e.message}`);
        self.emit(":tell", Messages.TFL_FAILURE);
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
            this.emit(':tell', "I didn't hear what bus number you said");
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
            console.log("No Context Object set on the provided request. Aborting");
            this.emit(':tell', Messages.ERROR);
            return;
        }

        if(this.event.context.System.user.permissions == undefined)
        {
            console.log("No Permissions object set on the provided request. Aborting");
            this.emit(':tell', Messages.MISSING_PERMISSIONS_REQUEST);
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
            console.log("User has given permission to access Device Location. Requesting...");
        }

        const alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);
        let deviceAddressRequest = alexaDeviceAddressClient.getFullAddress();

        deviceAddressRequest.then((addressResponse) => {
            switch(addressResponse.statusCode) {
                case 200:
                    const address = addressResponse.address;
                    var addressLine1 = address['addressLine1']
                    var postalCode = address['postalCode']
                    var searchAddress = addressLine1 + ' ' + postalCode;
                    console.log("Successfully retrieved Address from Alexa API: " + searchAddress);
                    
                    if( (addressLine1 == undefined || addressLine1.trim() == '') && (postalCode == undefined || postalCode.trim() == ''))
                    {
                        console.log(`Device Address does not have the required information. Search Address was [${searchAddress}]...Aborting`);
                        self.emit(":tell", Messages.EMPTY_ADDRESS);
                        return;
                    }
                    
                    
                    var options = {
                      provider: 'google',
                      httpAdapter: 'https', // Default 
                      apiKey: GEOCODE_APP_KEY, // for Mapquest, OpenCage, Google Premier 
                      formatter: null         // 'gpx', 'string', ... 
                    };
                     
                    var geocoder = NodeGeocoder(options);
                    
                    // Using callback 
                    geocoder.geocode(searchAddress, function(err, res) {
                        if(res != undefined && res[0] != undefined && res[0].latitude != undefined && res[0].longitude != undefined){
                            console.log(`Successfully found geocode information: lat=${res[0].latitude},long=${res[0].longitude}`);
                            getStopsForRoute(self, res[0].latitude, res[0].longitude, routeNumber, routeDirection);
                        }
                        else
                        {
                            console.log(`Error getting geocode information for address: ${err}`);
                            self.emit(":tell", Messages.NO_GEOCODE_ADDRESS);
                        }
                    });
                        
                    break;
                case 204:
                    // This likely means that the user didn't have their address set via the companion app.
                    console.log(`Successfully requested from the device address API, but no address was returned. Status Code: ${response.statusCode}`);
                    this.emit(":tell", Messages.NO_ADDRESS);
                    break;
                case 403:
                    console.log(`The consent token we had wasn't authorized to access the user's address. Status Code: ${response.statusCode}`);
                    this.emit(":tellWithPermissionCard", Messages.NOTIFY_MISSING_PERMISSIONS, PERMISSIONS);
                    break;
                default:
                    console.log(`The consent token we had wasn't authorized to access the user's address. Status Code: ${response.statusCode}`);
                    this.emit(":tell", Messages.LOCATION_FAILURE);
            }
        });

        deviceAddressRequest.catch((error) => {
            this.emit(":tell", Messages.ERROR);
            console.error(error);
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
