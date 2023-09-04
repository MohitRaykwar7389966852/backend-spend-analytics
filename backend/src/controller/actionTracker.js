require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
const stream = require("stream");
const { google } = require("googleapis");
const path = require("path");
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

const KEYFILEPATH = path.join("credentials.json");
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const uploadFile = async (fileObject) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);
    const { data } = await google.drive({ version: "v3", auth }).files.create({
        media: {
            mimeType: fileObject.mimeType,
            body: bufferStream,
        },
        requestBody: {
            name: fileObject.originalname,
            parents: [process.env.FOLDER],
        },
        fields: "id,name",
    });
    console.log(`Uploaded file ${data.name} ${data.id} ${data}`);
    return data;
};

const actionTracker = async function (req, res) {
    try {
        let actioninClause;
        if(req["ActionTracking_test_Clause"]) actioninClause = req["ActionTracking_test_Clause"];
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ActionTracking_test] ${actioninClause}`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const createActionTable = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ActionTracking_test_upd]`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const actionUpdate = async function (req, res) {
    try {
        let date = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
        });
        let actionId = req.params.actionId;
        let data = req.body;
        let at = data.ActionType;
        let an = data.ActionName;
        console.log(data);
        let str;
        if (at != undefined && an != undefined) {
            str = "ActionType = '" + at + "' , ActionName = '" + an + "'";
        } else if (at != undefined) str = "ActionType = '" + at + "'";
        else if (an != undefined) str = "ActionName = '" + an + "'";
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var updated = await poolConnection
            .request()
            .query(
                "UPDATE DevOps.ActionTracking_test SET " +
                    str +
                    " , EditedOn = '" +
                    date +
                    "' WHERE Id = " +
                    actionId
            );
        poolConnection.close();
        console.log("disconnected");
        console.log(updated);
        return res
            .status(200)
            .send({ message: "data updated successfully", result: updated });
    } catch (e) {
        console.log(e.message);
        res.status(500).send({ status: false, message: e.message });
    }
};

const actionTree = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ActionTracking_tree_test] WHERE Status = 'Approved'`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const actionTreeById = async function (req, res) {
    try {
        let actionId = req.params.actionId;
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ActionTracking_tree_test] WHERE Id = ${actionId}`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const actionAdd = async function (req, res) {
    try {
        const { body, files } = req;
        console.log(body);
        console.log(files);
        let {
            ActionType,
            ActionName,
            ActionNumber,
            ActionDescription,
            Owner,
            Approver,
            ApproverMail,
        } = body;
        let date = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
        });
        let acNum = Number(ActionNumber);
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var maxid = await poolConnection.request().query(`SELECT max(Id)
        FROM [DevOps].[ActionTracking_tree_test]`);
        let nextid = maxid.recordset[0][""] + 1;
        let attachmentUrl = "";
        if (files.length !== 0) {
            let uploaded = await uploadFile(files[0]);
            attachmentUrl = "https://drive.google.com/open?id=" + uploaded.id;
            attachmentUrl = attachmentUrl.toString();
        }
        var inserted = await poolConnection.request()
            .query(`INSERT INTO DevOps.ActionTracking_tree_test 
        (Id,ActionType,ActionName,ActionNumber,ActionDescription,Owner,Approver,Attachment,EditedOn,Status)
        VALUES(${nextid},'${ActionType}','${ActionName}',${acNum},'${ActionDescription}','${Owner}','${Approver}','${attachmentUrl}','${date}','Pending')
        `);
        console.log(inserted);
        poolConnection.close();
        console.log("disconnected");
        let url1 = `https://statxo-backend.onrender.com/actionapproval/${nextid}?Status='Approved'`;
        let url2 = `https://statxo-backend.onrender.com/actionapproval/${nextid}?Status='Rejected'`;
        let siteView = `https://spend-analytics-plaform.netlify.app/actionapproval/${nextid}`;

        const params = {
            Destination: {
              ToAddresses: [ApproverMail], // Replace with the recipient's email address
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
                  <h3 style="margin-bottom:20px;">Hello ${Approver}</h3>
                  <div>
                      <a style="background:#26a69a; margin-right:4px;" href=${url1}>Approve</a>
                      <a style="background: #ef5350; margin-right:4px;" href=${url2}>Reject</a>
                      <a style="background:#4FC3F7; margin-right:4px;" href=${siteView}>Site View</a>
                  </div>
                  <p style="color:#757575; margin-top:20px;">${Owner} want approval for the action with deatil mentioned below :-</p>
                  <div style="font-size:13px;">
                  <p>Action Type : ${ActionType}</p>
                  <p>Action Name : ${ActionName}</p>
                  <p>Action Number : ${ActionNumber}</p>
                  <p>Action Description : ${ActionDescription}</p>
                  <p>Owner : ${Owner}</p>
                  <p>Approver : ${Approver}</p>
                  <p>Attachment : <a style="background: #5c6bc0;" href=${attachmentUrl}>Attachment</a></p>
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
                Data: 'New Action Approval',
              },
            },
            Source: process.env.STATXO_MAIL, // Replace with the sender's email address
          };
          
          ses.sendEmail(params, (err, data) => {
            if (err) {
                console.log(err);
                return res.status(400).send({ status:false,message: err.message });
            } else {
                console.log(data);
                return res.status(200).send({status:true, result: inserted,message:"request sent successfully" });
            }
        });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const actionApproval = async function (req, res) {
    try {
        let Id = req.params.Id;
        let Status = req.query.Status;
        let RejectDes = req.query.Description;
        if (RejectDes === undefined) RejectDes = "";
        let date = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
        });
        console.log(Status,date,Id);
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var st = await poolConnection.request().query(`SELECT Status
        FROM [DevOps].[ActionTracking_tree_test] WHERE Id = ${Id}`);
        let lastStatus = st.recordset[0].Status;
        if (lastStatus == "Pending") {
            let updated = await poolConnection
                .request()
                .query(
                    `UPDATE DevOps.ActionTracking_tree_test SET Status =${Status} , EditedOn = '${date}' WHERE Id = ${Id}`
                );
            let actionData = await poolConnection
                .request()
                .query(
                    `SELECT * FROM DevOps.ActionTracking_tree_test WHERE Id = ${Id}`
                );
            let acData = actionData.recordsets[0][0];

            let {
                ActionType,
                ActionName,
                ActionNumber,
                ActionDescription,
                Owner,
                Approver,
                Attachment,
            } = acData;

            const params = {
                Destination: {
                  ToAddresses: [userMail], // Replace with the recipient's email address
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
                      <h3 class="text-primary">Hello ${Owner}</h3>
                      <p style="color:#757575">Action with data mentioned below is ${Status} by approver - ${Approver}</p>
                      <p style="color:#757575; font-size:13px;">${RejectDes}</p>
                      <div style="font-size:13px;">
                      <p>Action Type : ${ActionType}</p>
                      <p>Action Name : ${ActionName}</p>
                      <p>Action Number : ${ActionNumber}</p>
                      <p>Action Description : ${ActionDescription}</p>
                      <p>Owner : ${Owner}</p>
                      <p>Approver : ${Approver}</p>
                      <p>Attachment : <a style="background: #5c6bc0;" href=${Attachment}>Attachment</a></p>
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
                    Data: 'Action Approval Status',
                  },
                },
                Source: process.env.STATXO_MAIL, // Replace with the sender's email address
              };
              
              ses.sendEmail(params, (err, data) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send({ status:false,message: err.message });
                } else {
                    console.log(data);
                }
            });
            res.status(200).send({
                message: "this action is updated by approver",
                result: updated,
            });
        } else if (lastStatus == "Approved") {
            res.status(200).send({
                message: "this action is approved already",
            });
        } else {
            res.status(200).send({
                message: "this action is rejected already",
            });
        }

        poolConnection.close();
        console.log("disconnected");

        return;
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = {
    actionTracker,
    actionUpdate,
    actionTree,
    actionTreeById,
    actionAdd,
    actionApproval,
    createActionTable,
};
