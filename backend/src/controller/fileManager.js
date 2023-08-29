require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
// var conv = require('binstring');

const fileManager = async function (req, res) {
    try {
        const { body } = req;
        let objectData = body.fileData;
        let folder = body.folder;
        console.log(objectData);
        console.log(folder);
       
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var maxid = await poolConnection.request().query(`SELECT max(Id)
        FROM [DevOps].[Table_FileMgr]`);
        console.log(maxid);
        let nextid = Number(maxid.recordset[0][""]) + 1;
        console.log(nextid);

        var inserted = await poolConnection.request()
            .query(`INSERT INTO DevOps.Table_FileMgr 
        (Id,ObjectData,Path)
        VALUES(${nextid},CONVERT(varbinary(max),'${objectData}'),'${folder}')
        `);
        console.log(inserted);

        poolConnection.close();
        console.log("disconnected");
        
        return res.status(201).send({ result: inserted , message:"file manager updated successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};


const getFiles = async function (req, res) {
    try {
        console.log("get file here---")
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var fileData = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Table_FileMgr]`);
        let bufferArray = fileData.recordset;
        let newArray=[];
        for(let i=0; i<bufferArray.length; i++){
            let data= bufferArray[i].ObjectData;
            let final = data.toString();
            newArray.push(final);
        }
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: newArray , message:"file manager data fetched successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const updateFiles = async function (req, res) {
    try {
        console.log("update main folders inner data");
        const { body } = req;
        let objectData = body.fileData;
        let folder = body.folder;
        console.log(folder);
        console.log(objectData);
       
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var record = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Table_FileMgr] WHERE Path = '${folder}'`);
        let recordId = record.recordset[0].Id;

        var updated = await poolConnection.request()
            .query(
                `UPDATE DevOps.Table_FileMgr SET ObjectData = CONVERT(varbinary(max),'${objectData}') WHERE Id = ${recordId}`
            );
        console.log(updated);

        poolConnection.close();
        console.log("disconnected");
        
        return res.status(201).send({ result: updated , message:"file manager updated successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const deleteFiles = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var fileData = await poolConnection.request().query(`DELETE
        FROM [DevOps].[Table_FileMgr]`);
        console.log(fileData);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: fileData , message:"files deleted successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = {
    fileManager,getFiles,deleteFiles,updateFiles
};
