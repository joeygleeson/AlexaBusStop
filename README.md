# AlexaBusStop
Alexa Bus Stop Skill

Deploying to AWS Lambda
1, Preparing the Deployment Package 

1A, Copy the javascript files to an empty folder
1B, In a terminal window in that folder, use npm to install the libraries that the code depends on
 - npm install alexa-sdk
 - npm install aws-sdk
 - npm install underscore
 - npm install https
 - npm install util
 - npm install node-geocoder

1C Zip the contents of the folder (i.e the javascript files and the node_modules folder). Make sure you do not zip the containing folder as it fail to work with AWS Lambda 

2, Upload the Deployment Packages to AWS Lambda