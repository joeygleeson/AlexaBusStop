# Alexa Bus Stop Skill

## Deploying to AWS Lambda

### Preparing the Deployment Package 

* Copy the javascript files to an empty folder
* In a terminal window in that folder, use npm to install the libraries that the code depends on
```
 npm install alexa-sdk
 npm install aws-sdk
 npm install underscore
 npm install https
 npm install util
 npm install node-geocoder
```
* Zip the contents of the folder (i.e the javascript files and the node_modules folder). Make sure you do not zip the containing folder as it fail to work with AWS Lambda 
* Upload the Deployment Packages to AWS Lambda

## Privacy Policy
Alexa London Bus Stop Skill ("us", "we", or "our") operates the London Bus Stop Skill at Alexa Skills section (the "Service").
This page informs you of our policies regarding the collection, use and disclosure of Personal Information when you use our Service.

We will not use or share your information with anyone except as described in this Privacy Policy.
By using the Service, you agree to the collection and use of information in accordance with this policy. Unless otherwise defined in this Privacy Policy.

### Information Collection And Use
To use our Service you will need to enable your device location to be made available us via the Alexa app or website. We use this device location to find the nearest bus stops to you. 
We do not store your device id or location information and we do not pass this information to other providers.
We do not collect or store any other personal information.

### Changes To This Privacy Policy
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
