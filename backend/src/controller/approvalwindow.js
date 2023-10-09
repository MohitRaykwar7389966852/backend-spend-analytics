require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");

const actionapprovalwidnow = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT Id,ownerEmail AS email,Approver as approver,Status As status,EditedOn AS date
        FROM [DevOps].[ActionTracking_tree_test] WHERE Status = 'Pending' AND ownerEmail IS NOT NULL`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const categoryapprovalwidnow = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT Id,ownerEmail AS email,Approver as approver,Status As status,EditedOn AS date
        FROM [DevOps].[CategoryTreeTable] WHERE Status = 'Pending' AND ownerEmail IS NOT NULL`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const helpapprovalwidnow = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT Id,Email AS email,Status As status,Title AS title,Date AS date
        FROM [DevOps].[Help_Desk_Table] WHERE Status IN ('Pending','In Progress')`);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data.recordsets });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = {
    actionapprovalwidnow,
    categoryapprovalwidnow,
    helpapprovalwidnow
};
