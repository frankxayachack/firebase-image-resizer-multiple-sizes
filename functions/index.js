const functions = require('firebase-functions');
const gcs = require('@google-cloud/storage')();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

const THUMB_PREFIX_SMALL = `small_`;
const THUMB_PREFIX_MEDIUM = `medium_`;
const THUMB_PREFIX_LARGE = `large_`;

const SIZE_SMALL = 400;
const SIZE_MEDIUM = 600;
const SIZE_LARGE = 1200;

exports.ImagesResize = functions.storage.object().onChange(event => {

    const object = event.data; // The Storage object.

    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    const resourceState = object.resourceState; // The resourceState is 'exists' or 'not_exists' (for file/folder deletions).
    const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.

    // Exit if this is triggered on a file that is not an image.
    if (!contentType.startsWith('image/')) {
        console.log('This is not an image.');
        return null;
    }
  
  // Get the file name.
  const fileName = path.basename(filePath);
  // Exit if the image is already a thumbnail.
  if (fileName.startsWith(THUMB_PREFIX_SMALL) || fileName.startsWith(THUMB_PREFIX_MEDIUM) || fileName.startsWith(THUMB_PREFIX_LARGE)) {
    console.log('Already a Thumbnail.');
    return null;
  }
  
  // Exit if this is a move or deletion event.
  if (resourceState === 'not_exists') {
    console.log('This is a deletion event.');
    return null;
  }
  
  // Exit if file exists but is not new and is only being triggered
  // because of a metadata change.
  if (resourceState === 'exists' && metageneration > 1) {
    console.log('This is a metadata change event.');
    return null;
  }

  // Download file from bucket.
  const bucket = gcs.bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);

  // Cloud function tmp
  const tempLocalThumbFileSMALL = path.join(os.tmpdir(), `${THUMB_PREFIX_SMALL}_${fileName}`);
  const tempLocalThumbFileMedium = path.join(os.tmpdir(), `${THUMB_PREFIX_MEDIUM}_${fileName}`);
  const tempLocalThumbFileLarge = path.join(os.tmpdir(), `${THUMB_PREFIX_LARGE}_${fileName}`);


  // FIREBASE SIDE
  // RESIZE AND MOVE FROM Cloud function tmp dir TO BUCKET
  const FILE_NAME_SMALL = `${THUMB_PREFIX_SMALL}_${fileName}`;
  const FILE_NAME_MEDIUM = `${THUMB_PREFIX_MEDIUM}_${fileName}`;
  const FILE_NAME_LARGE = `${THUMB_PREFIX_LARGE}_${fileName}`;

  const FILE_MOVE_TO_BUCKET_SMALL = path.join(path.dirname(filePath), FILE_NAME_SMALL);
  const FILE_MOVE_TO_BUCKET_MEDIUM = path.join(path.dirname(filePath), FILE_NAME_MEDIUM);
  const FILE_MOVE_TO_BUCKET_LARGE = path.join(path.dirname(filePath), FILE_NAME_LARGE);
  

  const metadata = {
    contentType: contentType,
  };
  return bucket.file(filePath).download({
    destination: tempFilePath,
  }).then(() => {
    console.log('Image downloaded locally to', tempFilePath);
    // Generate a thumbnail using ImageMagick.
    return spawn('convert', [tempFilePath, '-resize', `${SIZE_SMALL}`, tempLocalThumbFileSMALL]).then(() => {

      return bucket.upload(tempLocalThumbFileSMALL, {
        destination: FILE_MOVE_TO_BUCKET_SMALL,
        metadata: metadata,
      }).then(() => {

        return spawn('convert', [tempFilePath, '-resize', `${SIZE_MEDIUM}`, tempLocalThumbFileMedium]).then(() => {

          return bucket.upload(tempLocalThumbFileMedium, {
            destination: FILE_MOVE_TO_BUCKET_MEDIUM,
            metadata: metadata,
          }).then(() => {
            
            return spawn('convert', [tempFilePath, '-resize', `${SIZE_LARGE}`, tempLocalThumbFileLarge]).then(() => {

              return bucket.upload(tempLocalThumbFileLarge, {
                destination: FILE_MOVE_TO_BUCKET_LARGE,
                metadata: metadata,
              }).then(() => {
                //clear files in tmp of cloud functions
                return Promise.all([fs.unlinkSync(tempFilePath), fs.unlinkSync(tempLocalThumbFileSMALL), fs.unlinkSync(tempLocalThumbFileMedium), fs.unlinkSync(tempLocalThumbFileLarge)]);
                
              });

            });

          });

        });

      });

    });
  });

});