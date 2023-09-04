require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
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

const mailtest = async function (req, res) {
    try {

        console.log("started");
        const params = {
            Destination: {
              ToAddresses: ['mohit.raykwar@statxo.com'], // Replace with the recipient's email address
            },
            Message: {
              Body: {
                Text: {
                  Data: 'Hello, this is the email body.',
                },
              },
              Subject: {
                Data: 'Your Subject Here',
              },
            },
            Source: 'mraykwar99@outlook.com', // Replace with the sender's email address
          };
          
          ses.sendEmail(params, (err, data) => {
            if (err) {
              console.error('Error sending email:', err);
            } else {
              console.log('Email sent:', data);
            }
          });


    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
}



const categoryTree = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[CategoryTreeTable]`);
        poolConnection.close();
        console.log("disconnected");
        console.log(data.recordsets);
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const addCategory = async function (req, res) {
    try {
        const { body, files } = req;
        console.log(body);
        
        let {
            l1category,
            l2category,
            l3category,
            l4category,
            description,
            Owner,
            Approver,
            ApproverMail,
        } = body;
        console.log(l1category,l2category,l3category,l4category);
        console.log(ApproverMail);

        let date = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
        });
        var poolConnection = await sql.connect(config);
        console.log("connected");

        
        var maxid = await poolConnection.request().query(`SELECT max(Id)
        FROM [DevOps].[CategoryTreeTable]`);
        let nextid = maxid.recordset[0][""] + 1;

        var inserted = await poolConnection.request()
            .query(`INSERT INTO DevOps.CategoryTreeTable 
        (Id,L1Category,L2Category,L3Category,L4Category,Description,Owner,Approver,EditedOn,Status)
        VALUES(${nextid},'${l1category}','${l2category}','${l3category}','${l4category}','${description}','${Owner}','${Approver}','${date}','Pending')
        `);
        console.log(inserted);
        poolConnection.close();
        console.log("disconnected");
        let url1 = `http://localhost:4000/categoryapproval/${nextid}?Status='Approved'`;
        let url2 = `https://statxo-backend.onrender.com/actionapproval/${nextid}?Status='Rejected'`;
        let siteView = `http://localhost:3000/categoryapproval/${nextid}`;

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
                  <p style="color:#757575; margin-top:20px;">${Owner} want approval for the new category with deatil mentioned below :-</p>
                  <div style="font-size:13px;">
                  <p>L1 Category : ${l1category}</p>
                  <p>L2 Category : ${l2category}</p>
                  <p>L3 Category : ${l3category}</p>
                  <p>L4 Category : ${l4category}</p>
                  <p>Description : ${description}</p>
                  <p>Owner : ${Owner}</p>
                  <p>Approver : ${Approver}</p>
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
                Data: 'New Category Approval',
              },
            },
            Source: process.env.STATXO_MAIL
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

const categoryTreeById = async function (req, res) {
    try {
        let categoryId = req.params.categoryId;
        console.log(categoryId);
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[CategoryTreeTable] WHERE Id = ${categoryId}`);
        console.log(data.recordsets);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const categoryApproval = async function (req, res) {
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
        FROM [DevOps].[CategoryTreeTable] WHERE Id = ${Id}`);
        let lastStatus = st.recordset[0].Status;
        if (lastStatus == "Pending") {
            let updated = await poolConnection
                .request()
                .query(
                    `UPDATE DevOps.CategoryTreeTable SET Status =${Status} , EditedOn = '${date}' WHERE Id = ${Id}`
                );
            let categoryData = await poolConnection
                .request()
                .query(
                    `SELECT * FROM DevOps.CategoryTreeTable WHERE Id = ${Id}`
                );
            let catData = categoryData.recordsets[0][0];

            let {
                L1Category,
                L2Category,
                L3Category,
                L4Category,
                Description,
                Owner,
                Approver,
            } = catData;

            let userMail = "mohit.raykwar@statxo.com";
            const mailOptions = {
                from: process.env.STATXO_MAIL,
                to: userMail,
                subject: "Category Approval Status",
                html: `<html>
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
                <p style="color:#757575">Category with data mentioned below is ${Status} by approver - ${Approver}</p>
                <p style="color:#757575; font-size:13px;">${RejectDes}</p>
                <div style="font-size:13px;">
                <p>L1 Category : ${L1Category}</p>
                <p>L1 Category : ${L2Category}</p>
                <p>L1 Category : ${L3Category}</p>
                <p>L1 Category : ${L4Category}</p>
                <p>Description : ${Description}</p>
                <p>Owner : ${Owner}</p>
                <p>Approver : ${Approver}</p>
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
            };

            transport.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    return res.status(400).send({ status:false,message: err.message });
                } else {
                    console.log(info);
                }
            });
            res.status(200).send({
                message: "this category is updated by approver",
                result: updated,
            });
        } else if (lastStatus == "Approved") {
            res.status(200).send({
                message: "this category is approved already",
            });
        } else {
            res.status(200).send({
                message: "this category is rejected already",
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
    categoryTree,
    addCategory,
    categoryTreeById,
    categoryApproval,
    mailtest
};
