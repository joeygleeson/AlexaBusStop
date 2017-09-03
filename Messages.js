'use strict';

/**
 * This file contains a map of messages used by the skill.
 */

const NOTIFY_MISSING_PERMISSIONS = "Please enable Location permissions in the Amazon Alexa app.";

const NO_ADDRESS = "It looks like you don't have an address set. You can set your address from the companion app.";

const NO_GEOCODE_ADDRESS = "I was unable to find your location from the address you provided. Please check your details are entered correctly and try again";

const ERROR = "Uh Oh. Looks like something went wrong.";

const LOCATION_FAILURE = "There was an error with the Device Address API. Please try again.";

const UNHANDLED = "This skill doesn't support that. Please ask something else.";


module.exports = {
    "NOTIFY_MISSING_PERMISSIONS": NOTIFY_MISSING_PERMISSIONS,
    "NO_ADDRESS": NO_ADDRESS,
    "NO_GEOCODE_ADDRESS": NO_GEOCODE_ADDRESS,
    "ERROR": ERROR,
    "LOCATION_FAILURE": LOCATION_FAILURE,
    "UNHANDLED": UNHANDLED,
};