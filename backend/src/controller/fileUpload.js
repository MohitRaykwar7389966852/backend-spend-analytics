const AWS = require('aws-sdk');
// require('aws-sdk/lib/maintenance_mode_message').suppress = true;

// Configure AWS with your access and secret keys
AWS.config.update({
  accessKeyId: 'AKIAXWODID4Z2HPJEB6D',
  secretAccessKey: 'pHZ44Yjlkr3Lky4XTncEdXblbpD3jC2hs3OcOZPI',
  region: 'eu-north-1',
});

let uploadFile= async (file) =>{
    console.log("uploading");
    return new Promise( function(resolve, reject) {
     let s3 = new AWS.S3({apiVersion: '2006-03-01'});

     var uploadParams= {
         ACL: "public-read",
         Bucket: "demo",
         Key: file.originalname,
         Body: file.buffer
     }
    
     s3.upload( uploadParams, function (err, data ){
         if(err) return reject({"error": err})
         return resolve(data.Location);
     })
    })
 }

 module.exports = {
    uploadFile
};