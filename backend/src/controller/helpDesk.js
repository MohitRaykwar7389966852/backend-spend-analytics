require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
const stream = require("stream");
const { google } = require("googleapis");
const path = require("path");
const { admin } = require("googleapis/build/src/apis/admin");
//aws
const AWS = require('aws-sdk');
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

// Configure AWS with your access and secret keys
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESSKEY,
  secretAccessKey: process.env.AWS_SECRETKEY,
  region: process.env.AWS_REGION,
});
// Create an SES object
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// upload files
let s3 = new AWS.S3({apiVersion: '2006-03-01'});
let uploadFile= async (file) =>{
    console.log("uploading");
    return new Promise( function(resolve, reject) {
    
        var uploadParams= {
         ACL: "public-read",
         Bucket: "statxospendanalytics/helpdesk",
         Key: file.originalname,
         Body: file.buffer
     }
    
     s3.upload(uploadParams, (err, data) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`File uploaded successfully. URL: ${data.Location}`);
            resolve(data.Location);
        }
    });
    })
 }

//google drive
// const KEYFILEPATH = path.join("credentials.json");
// const SCOPES = ["https://www.googleapis.com/auth/drive"];

// const auth = new google.auth.GoogleAuth({
//     keyFile: KEYFILEPATH,
//     scopes: SCOPES,
// });

// const uploadFile = async (fileObject) => {
//     console.log("uploading started...");
//     const bufferStream = new stream.PassThrough();
//     bufferStream.end(fileObject.buffer);
//     console.log("buffer completed");
//     const { data } = await google.drive({ version: "v3", auth }).files.create({
//         media: {
//             mimeType: fileObject.mimeType,
//             body: bufferStream,
//         },
//         requestBody: {
//             name: fileObject.originalname,
//             parents: [process.env.FOLDER],
//         },
//         fields: "id,name",
//     });
//     console.log(`Uploaded file ${data.name} ${data.id} ${data}`);
//     return data;
// };

const helpDesk = async function (req, res) {
    try {
        let { body, files } = req;
        console.log(body, files);
        const user = req.userDetails;

        let { title, comment, date, priority, section } = body;

        let fileUrl = "";
        if (files.length !== 0) {
            let uploaded = await uploadFile(files[0]);
            // fileUrl = "https://drive.google.com/open?id=" + uploaded.id;
            fileUrl = uploaded.toString();
            console.log(fileUrl);
        }
        console.log(user.Email,title,section,priority,comment,date,fileUrl);
        var poolConnection = await sql.connect(config);
        console.log("connected");

        let inserted = await poolConnection.request()
            .query(`INSERT INTO DevOps.Help_Desk_Table 
        (Email,Title,Comment,Priority,Section,Date,Attachment,Status,Admin_Comment)
        VALUES('${user.Email}','${title}','${comment}','${priority}','${section}','${date}','${fileUrl}','Pending','')
        `);

        var username = await poolConnection.request().query(`SELECT Name
        FROM [DevOps].[Login_Table] WHERE Email = '${user.Email}'`);
        username = username.recordset[0].Name;

        var maxid = await poolConnection.request().query(`SELECT max(Id)
        FROM [DevOps].[Help_Desk_Table]`);
        let id = maxid.recordset[0][""];
        console.log(id);
        poolConnection.close();
        console.log("disconnected");
        let siteView = `https://spendxo.com/help-response/${id}`;

        const params = {
            Destination: {
              ToAddresses: [process.env.ADMIN_MAIL,"prashant.yadav@statxo.com"], // Replace with the recipient's email address
            },
            Message: {
              Body: {
                Html: {
                  Data: `<html>
                  <head>
                      <style type="text/css">
                          div a{
                              text-decoration: none;
                              color: white;
                              border: none;
                              padding: 8px;
                              border-radius: 5px;
                          }
                      </style>
                  </head>
                  <body style="font-family: open sans;">
                  <h3 class="text-primary">Hello Admin</h3>
                  <p style="color:#757575">${username} requests help with the following problem :-</p>
                  <div>
                      <a style="background:#4FC3F7; margin-right:4px; padding:5px; border-radius:5px;" href=${siteView}>Site View</a>
                  </div>
                  <div style="font-size:13px;">
                  <p>Title : ${title}</p>
                  <p>Comment : ${comment}</p>
                  <p>Date : ${date}</p>
                  <p>Priority : ${priority}</p>
                  <p>Section : ${section}</p>
                  <p>Attachment : <a style="background: #5c6bc0; padding:5px; border-radius:5px;" href=${fileUrl}>Attachment</a></p>
                  </div>
                  <h1 style="color:#C2185B; margin-bottom:0px;">STATXO</h1>
                  <p style="color:#C2185B; font-size:10px;  margin-bottom:10px;">Powering Smarter Decisions</p>
                  <p style="color:#757575; font-size:14px;">Website :- <a style="color:blue; text-decoration:underline;" href="https://www.statxo.com/">www.statxo.com</a></p>
                  <p style="color:#757575; font-size:14px;">Number :- XXXXXXXXXX</p>
                  <p style="color:#C2185B; font-size:13px;  margin-bottom:10px;">New Delhi | Bengaluru | Romania | US</p>
                  <p style="font-size:11px;">Disclaimer Statement</p>
                  <p style="font-size:13px;">This message may also contain any attachments if included will contain purely confidential information intended for a specific individual 
                  and purpose, and is protected by law. If you are not the intended recipient of this message, you are requested to delete this message and are hereby notified that any disclosure,
                   copying, or distribution of this message, or the taking of any action based on it, is strictly prohibited.</p>
                  `,
                },
              },
              Subject: {
                Data: 'Help Desk Query',
              },
            },
            Source: process.env.STATXO_MAIL, // Replace with the sender's email address
          };
          if(inserted){
            ses.sendEmail(params, (err, data) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send({ status:false,message: err.message });
                } else {
                    console.log(data);
                    return res.status(200).send({ status:true,message: "Request sent successfully" });
                }
            });
          }

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const getQuery = async function (req, res) {
    try {
        const user = req.userDetails;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        let data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Help_Desk_Table] WHERE Email = '${user.Email}'`);
        console.log(data.recordsets);
        return res.status(200).send({ status:true, result: data.recordsets , message:"Help queries fetched successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const getQueryById = async function (req, res) {
    try {
        let { params } = req;
        let { Id } = params;

        var poolConnection = await sql.connect(config);
        console.log("connected");

        let data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Help_Desk_Table] WHERE Id = ${Id}`);
        console.log(data.recordsets);
        return res.status(200).send({ status:true, result: data.recordsets , message:"Help queries fetched successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const helpResponse = async function (req, res) {
    try {
        let Id = req.params.Id;
        let status = req.query.Status;
        let adminComment = req.query.Description;
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var st = await poolConnection.request().query(`SELECT Status
        FROM [DevOps].[Help_Desk_Table] WHERE Id = ${Id}`);
        let lastStatus = st.recordset[0].Status;
        let date = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
        });
        let resMsg = "";
        let updated;
        if(lastStatus == "Pending" || (lastStatus == "In Progress" && (status == "Completed" || status == "Rejected"))) {
            updated = await poolConnection
                .request()
                .query(
                    `UPDATE DevOps.Help_Desk_Table SET Admin_Comment ='${adminComment}', Status ='${status}' WHERE Id = ${Id}`
                );
            let queryData = await poolConnection
                .request()
                .query(
                    `SELECT * FROM DevOps.Help_Desk_Table WHERE Id = ${Id}`
                );
            let qData = queryData.recordsets[0][0];

            let {
                Title,
                Comment,
                Section,
                Priority,
                Date,
                Status,
                Attachment,
                Admin_Comment,
                Email
            } = qData;

            console.log(qData);

            let userMail = Email;

            const params = {
                Destination: {
                  ToAddresses: [userMail],
                },
                Message: {
                  Body: {
                    Html: {
                      Data: `<html>
                      <head>
                          <style type="text/css">
                              div a{
                                  text-decoration: none;
                                  color: white;
                                  border: none;
                                  padding: 8px;
                                  border-radius: 5px;
                              }
                          </style>
                      </head>
                      <body style="font-family: open sans;">
                      <h3 class="text-primary">Hello Admin</h3>
                      <p style="color:#757575">Help Request with data mentioned below is ${Status}</p>
                      <div style="font-size:13px;">
                      <p>Title : ${Title}</p>
                      <p>Section : ${Section}</p>
                      <p>Priority : ${Priority}</p>
                      <p>Request Date : ${Date}</p>
                      <p>Status : ${Status}</p>
                      <p>Comment : ${Comment}</p>
                      <p>Attachment : <a style="background: #5c6bc0;" href=${Attachment}>Attachment</a></p>
                      <p>Admin Response : ${Admin_Comment}</p>
                      </div>
                      <h1 style="color:#C2185B; margin-bottom:0px;">STATXO</h1>
                      <p style="color:#C2185B; font-size:10px;  margin-bottom:10px;">Powering Smarter Decisions</p>
                      <p style="color:#757575; font-size:14px;">Website :- <a style="color:blue; text-decoration:underline;" href="https://www.statxo.com/">www.statxo.com</a></p>
                      <p style="color:#757575; font-size:14px;">Number :- XXXXXXXXXX</p>
                      <p style="color:#C2185B; font-size:13px;  margin-bottom:10px;">New Delhi | Bengaluru | Romania | US</p>
                      <p style="font-size:11px;">Disclaimer Statement</p>
                      <p style="font-size:13px;">This message may also contain any attachments if included will contain purely confidential information intended for a specific individual 
                      and purpose, and is protected by law. If you are not the intended recipient of this message, you are requested to delete this message and are hereby notified that any disclosure,
                       copying, or distribution of this message, or the taking of any action based on it, is strictly prohibited.</p>
                      `,
                    },
                  },
                  Subject: {
                    Data: 'Help Desk Response',
                  },
                },
                Source: process.env.STATXO_MAIL, 
              };
              
              ses.sendEmail(params, (err, data) => {
                if (err) {
                    console.log(err);
                    // return res.status(400).send({ status:false,message: err.message });
                } else {
                    console.log(data);
                }
            });

            //notification
            let sts;
            let defaultValue = false;
            if(Status == "Completed"){
                sts = "success";
                resMsg = "help request completed";
            }
            else if(Status == "In Progress"){
                sts = "info";
                resMsg = "help request in progress";
            }
            else if(Status == "Rejected"){
                sts = "error";
                resMsg = "help request rejected";
            }
            console.log(date);
            await poolConnection.request().query(`INSERT INTO DevOps.Notification_Table 
            (Email, Section, Status, Message, isRead,isDelete,Timestumps)
            VALUES('${userMail}','help desk','${sts}','${resMsg}','${defaultValue}','${defaultValue}','${date}')
        `);
        }
        else if (lastStatus == "In Progress" && status == "In Progress") {
            resMsg = "Help query is already in progress";
        }
        else if (lastStatus == "Rejected" && (status == "Completed" || status == "In Progress" || status == "Rejected")) {
            resMsg = "Help query is already rejected";
        }
        else if (lastStatus == "Completed" && (status == "Completed" || status == "In Progress" || status == "Rejected")) {
            resMsg = "Help query is already completed";
        }        
        
        poolConnection.close();
        console.log("disconnected");

        return res.status(200).send({
            message: resMsg,
            // result: updated,
        });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = { helpDesk,getQuery,getQueryById,helpResponse };
