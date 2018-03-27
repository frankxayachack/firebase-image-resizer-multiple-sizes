# Automatically Resize image into multiple sizes

This is sample dememonstrates how to generate many sizes of images (Upload to Firebase storage) by using Firebase Cloud function and upload it to Bucket

## Functions Code

See [functions/index.js](functions/index.js) for the images generation code.

The description of how it's work is [here](https://firebase.google.com/docs/functions/gcp-storage-events) and [here](https://github.com/firebase/functions-samples/tree/master/generate-thumbnail)

The sample code from Google, they generate only one thumbnail but this repo will help you in case you need various sizes of image

The code is performed using ImageMagick (installed by default on Cloud Functions) to resize image and chain more promises for each size that declare on the beginning of the code

So to whom who has eslint for checking syntax it will display the green line below the code to warn that there are nested-promises so no worries about that it works fine!

## Trigger rules

The function triggers on upload of any file to your Firebase project's default Cloud Storage bucket.

## Deploy and test

[READ HERE](https://github.com/firebase/functions-samples/tree/master/generate-thumbnail)