require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");


const notification = async function (req, res) {
    try {
        const user = req.userDetails;
        let { body } = req;
        console.log(body);        
        let { section,status,message } = body;

        var poolConnection = await sql.connect(config);
        console.log("connected");

        let date = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
        });
        let defaultValue = false;
        let email=user.Email;
        console.log(req.query);
        if(req.query.hasOwnProperty("Email")) email = req.query.Email;
        const insert = await poolConnection.request().query(`INSERT INTO DevOps.Notification_Table 
            (Email, Section, Status, Message, isRead,isDelete,Timestumps)
            VALUES('${email}','${section}','${status}','${message}','${defaultValue}','${defaultValue}','${date}')
        `);

        poolConnection.close();
        console.log("disconnected");
        return res.status(201).send({ status:true, result: insert , message:"Notification saved successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const getNotification = async function (req, res) {
    try {
        const user = req.userDetails;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        let val = false;

        let data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Notification_Table] WHERE Email = '${user.Email}' AND isDelete = '${val}'`);
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(201).send({ status:true, result: data.recordset , message:"Notification fetched successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const readNotification = async function (req, res) {
    try {
        const user = req.userDetails;

        var poolConnection = await sql.connect(config);
        console.log("connected");

        let val1 = true , val2 = false;

        let updated = await poolConnection
        .request()
        .query(
            `UPDATE DevOps.Notification_Table SET isRead ='${val1}' WHERE Email = '${user.Email}' AND isRead = '${val2}'`
        );

        poolConnection.close();
        console.log("disconnected");
        return res.status(201).send({ status:true, result: updated , message:"Notification removed successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const delNotification = async function (req, res) {
    try {
        const user = req.userDetails;

        var poolConnection = await sql.connect(config);
        console.log("connected");

        let val1 = true , val2 = false;

        let updated = await poolConnection
        .request()
        .query(
            `UPDATE DevOps.Notification_Table SET isDelete ='${val1}' WHERE Email = '${user.Email}' AND isDelete = '${val2}'`
        );

        poolConnection.close();
        console.log("disconnected");
        return res.status(201).send({ status:true, result: updated , message:"Notification removed successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};


module.exports = { notification,getNotification,delNotification,readNotification };
