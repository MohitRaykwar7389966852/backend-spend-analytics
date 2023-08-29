require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

var transport = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secureConnection:false,
    requireTLS: true,
    tls: { ciphers: "SSLv3" },
    auth: {
        user: process.env.STATXO_MAIL,
        pass: process.env.STATXO_MAIL_PASS,
    },
});

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
        const token = jwt.sign(obj,"spendAnalyticPlatform", { expiresIn: '10h' });
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
        const mailOptions = {
            from: process.env.STATXO_MAIL,
            to: email,
            subject: "OTP For Password Reset",
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
        };

        transport.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.log(err);
                return res.status(400).send({status:false, message:err.message });
            } else {
                console.log(info);
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

        // let arr2 = {
        //     spend:{
        //         ["Entity_Region P"]:["APAC","EMEA"],
        //         ["CountryCode"]:["ESP","ITA","CHN"],
        //         ["CompanyName"]:["ComapnyName 1","ComapnyName 2","ComapnyName 3"]
        //     },
        //     saving:{
        //         ["Entity_Region P"]:["EMEA"],
        //         ["CountryCode"]:["ESP","ITA","CHN"],
        //         ["CompanyName"]:["ComapnyName 0","ComapnyName 1","ComapnyName 2","ComapnyName 3"]
        //     },
        //     action:{
        //         ["Entity_Region P"]:["EMEA"],
        //         ["Entity_Region"]:["France"],
        //         ["CompanyName"]:["ComapnyName 2"]
        //     }
        // }

        // let spend = arr2.spend;
        // console.log(spend);
        
        // addString(spend);

        // function addString(data){

        //     let key = Object.keys(data);

        //     key.map(x=>{

            // })


            // if(en.length !== 0){
            //     const values = data.map((value) => `'${value}'`).join(', ');
            //     if(spendString)
            //     spendString += `WHERE [Entity_Region P] IN ${values}`
            // }
        // }

        // let str2 = JSON.stringify(arr2);

        // let updated = await poolConnection
        //         .request()
        //         .query(
        //             `UPDATE DevOps.ExcessRights SET  Access = '{}' WHERE Email IN ('abhishek.singh@statxo.com','mohit.raykwar@statxo.com')`
        //         );

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
