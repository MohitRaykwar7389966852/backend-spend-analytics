require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
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

const signup = async function (req, res) {
    try {
        const { body } = req;
        console.log(body);
        const {name,email,pass,company,job} = body
        let hashPass = bcrypt.hashSync(pass, saltRounds);
        console.log(hashPass);

        var poolConnection = await sql.connect(config);
        console.log("connected");

        var inserted = await poolConnection.request()
            .query(`INSERT INTO DevOps.Login_Table 
        (Name,Email,Pass,Company,Job)
        VALUES('${name}','${email}','${hashPass}','${company}','${job}')
        `);
        console.log(inserted);

        poolConnection.close();
        console.log("disconnected");
        
        return res.status(201).send({ status:true, result: inserted , message:"user registered successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};


const signin = async function (req, res) {
    try {
        console.log("--Login--");
        const {email,pass} = req.query;
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var loginCheck = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Login_Table] WHERE Email = '${email}'`);
        let loginArray = loginCheck.recordset;
        if(loginArray.length === 0) return res.status(400).send({status:false, message:"Email not matched" });
        let checkPass = bcrypt.compareSync(pass,loginArray[0].Pass);
        if(checkPass === false) return res.status(400).send({ status:false, message:"Password not matched" });

        var access = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ExcessRights] WHERE Email = '${email}'`);
        access = access.recordset[0];
        let isAdmin=false;
        if(access.AccessType == "admin") isAdmin = true;

        // if(access.Access !== "All") access.Access = JSON.parse(access.Access);

        //jwt
        let obj={
            Id: loginArray[0].Id,
            Name: loginArray[0].Name,
            Email: loginArray[0].Email,
            Company: loginArray[0].Company,
            Job: loginArray[0].Job,
            Access: access.Access
          };
        const token = jwt.sign(obj,"spendAnalyticPlatform", { expiresIn: '7d' });
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:{token:JSON.stringify(token),isAuth:isAdmin}, message:"Login successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const deleteUser = async function (req, res) {
    try {
        console.log("--delete user--");
        
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var fileData = await poolConnection.request().query(`DELETE
        FROM [DevOps].[Login_Table]`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:fileData, message:"All user deleted successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const resetPass = async function (req, res) {
    try {
        console.log("--reset password--");
        const { query } = req;
        const { email,pass } = query;
        console.log(email,pass);

        var poolConnection = await sql.connect(config);
        console.log("connected");
        let check = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Login_Table] WHERE Email = '${email}'`);
        console.log(check.recordset);
        let data = check.recordset;
        if(data.length === 0 ) return res.status(400).send({status:false, message:"Email Not Exist" });
        poolConnection.close();
        console.log("disconnected");

        let otp = Math.floor(Math.random()*899999+100000);

        const params = {
            Destination: {
              ToAddresses: [email], // Replace with the recipient's email address
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
                  <h3 style="margin-bottom:20px;">Hello User</h3>
                  <p style="color:#757575; margin-top:20px;">Here is the OTP to reset your password - ${otp}</p>
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
                Data: 'OTP For Password Reset',
              },
            },
            Source: process.env.STATXO_MAIL
          };

        ses.sendEmail(params, (err, data) => {
            if (err) {
                console.log(err);
                return res.status(400).send({status:false, message:err.message });
            } else {
                console.log(data);
                return res.status(200).send({status:true,result:{otp:otp,id:data[0]["Id"]}, message:"otp sent successfully" });
            }
        });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const verifyPass = async function (req, res) {
    try {
        console.log("--reset password--");
        const { query } = req;
        const { id,pass } = query;
        console.log(id,pass);
        let hashPass = bcrypt.hashSync(pass, saltRounds);
        console.log(hashPass);
        var poolConnection = await sql.connect(config);
        console.log("connected");
        let updated = await poolConnection
                .request()
                .query(
                    `UPDATE DevOps.Login_Table SET Pass ='${hashPass}' WHERE Id = ${Number(id)}`
                );
        console.log(updated);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:updated, message:"password changed successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const access = async function (req, res) {
    try {
        const user = req.userDetails;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ExcessRights]`);

        data = data.recordset;
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:data, message:"Access Data successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = {
    signup,signin,deleteUser,resetPass,verifyPass,access
};
