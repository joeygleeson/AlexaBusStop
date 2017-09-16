'use strict';

/**
 * This file contains a map of messages used by the skill.
 */

const NOTIFY_MISSING_PERMISSIONS = "Please enable Location permissions in the Amazon Alexa app.";

const MISSING_PERMISSIONS_REQUEST = "Sorry, It looks like your request was missing important permissions information. ";

const NO_ADDRESS = "It looks like you don't have an address set. You can set your address from the companion app.";

const EMPTY_ADDRESS = "It looks like you don't have an address set fully. You can set your address from the companion app.";

const NO_GEOCODE_ADDRESS = "Sorry, I was unable to find your location from the address you provided. Please check your details are entered correctly and try again";

const ERROR = "Sorry, Looks like something went wrong. Please try again";

const LOCATION_FAILURE = "There was a problem getting your location information from Alexa. Please try again.";

const TFL_FAILURE = "There was an problem getting Bus information from TFL. Please try again.";

const UNHANDLED = "This skill doesn't support that. Please ask something else.";


module.exports = {
    "NOTIFY_MISSING_PERMISSIONS": NOTIFY_MISSING_PERMISSIONS,
    "NO_ADDRESS": NO_ADDRESS,
    "NO_GEOCODE_ADDRESS": NO_GEOCODE_ADDRESS,
    "ERROR": ERROR,
    "LOCATION_FAILURE": LOCATION_FAILURE,
    "UNHANDLED": UNHANDLED,
};