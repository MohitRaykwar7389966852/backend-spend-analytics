require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");

const validationData = async function (req, res) {
    try {
        const inClause = req.inClause;
        var poolConnection = await sql.connect(config);
        console.log("connected");
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ValidationTable]`);

        var grand = await poolConnection.request().query(`SELECT SUM(Sum_of_Grand_Total) AS grandTotal,COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS grandMap,COUNT(case when [New  L4 - Global Procurement] = null then 0 else 1 end) AS grandL4validation
        FROM [DevOps].[ValidationTable]`);
        let grandTotal = grand.recordsets[0][0]["grandTotal"];
        let grandMap = grand.recordsets[0][0]["grandMap"];
        let grandL4validation = grand.recordsets[0][0]["grandL4validation"];
        

        var table = await poolConnection.request().query(`SELECT [Company Code],SUM(Sum_of_Grand_Total) AS spend,COUNT(DISTINCT [Supplier Parent Name]) AS supplier,SUM(CASE WHEN [New  L4 - Global Procurement] = null THEN 0 ELSE Sum_of_Grand_Total END) AS validatedspend,COUNT(CASE WHEN [New  L4 - Global Procurement] = null THEN 0 ELSE Sum_of_Grand_Total END) AS pid,COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS map,COUNT(case when [New  L4 - Global Procurement] = null then 0 else 1 end) AS l4validation
        FROM [DevOps].[ValidationTable] GROUP BY [Company Code]`);
1
        table = table.recordsets[0];

        for(let i =0; i<table.length; i++){
            let p1 = (table[i].validatedspend/grandTotal)*100;
            table[i].validatedspend = Math.ceil(p1)+"%";
            let p2 = (table[i].map/grandMap)*100;
            table[i].map = Math.ceil(p2)+"%";
            let p3 = (table[i].l4validation/grandL4validation)*100;
            table[i].l4validation = Math.ceil(p3)+"%";
        }

        var data1 = await poolConnection.request().query(`SELECT COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS [Ok by default],COUNT(case when [Proposed Status] = 'Change Category' then 1 else null end) AS [Change Category],COUNT(case when [Proposed Status] = 'Review Later' then 1 else null end) AS [Review Later]
        FROM [DevOps].[ValidationData]`);
        data1 = data1.recordsets[0][0];

        var data2 = await poolConnection.request().query(`SELECT [Company Code],SUM(Sum_of_Grand_Total)
        FROM [DevOps].[ValidationTable] GROUP BY [Company Code]`);
        data2 = data2.recordsets[0];
        let sum=0;
        for(let i=0; i<data2.length; i++){
            sum = sum+data2[i][""];
        }
        let ar1=[],ar2=[];
        for(let i=0; i<data2.length; i++){
            let p = (data2[i][""]/sum)*100;
            ar1.push(data2[i]["Company Code"]);
            ar2.push(Math.ceil(p));
        }

        let result={
            main:data.recordsets[0],
            table:table,
            status:data1,
            categoryByEntity:{
                label:ar1,
                data:ar2
            }
        };

        poolConnection.close();
        console.log("disconnected");

        return res.status(200).send({ result: result });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const validationShortTable = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var grand = await poolConnection.request().query(`SELECT SUM(Sum_of_Grand_Total) AS grandTotal,COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS grandMap,COUNT(case when [New  L4 - Global Procurement] = null then 0 else 1 end) AS grandL4validation
        FROM [DevOps].[ValidationTable]`);
        let grandTotal = grand.recordsets[0][0]["grandTotal"];
        let grandMap = grand.recordsets[0][0]["grandMap"];
        let grandL4validation = grand.recordsets[0][0]["grandL4validation"];
        

        var table = await poolConnection.request().query(`SELECT [Company Code],SUM(Sum_of_Grand_Total) AS spend,COUNT(DISTINCT [Supplier Parent Name]) AS supplier,SUM(CASE WHEN [New  L4 - Global Procurement] = null THEN 0 ELSE Sum_of_Grand_Total END) AS validatedspend,COUNT(CASE WHEN [New  L4 - Global Procurement] = null THEN 0 ELSE Sum_of_Grand_Total END) AS pid,COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS map,COUNT(case when [New  L4 - Global Procurement] = null then 0 else 1 end) AS l4validation
        FROM [DevOps].[ValidationTable] GROUP BY [Company Code]`);
1
        table = table.recordsets[0];

        for(let i =0; i<table.length; i++){
            let p1 = (table[i].validatedspend/grandTotal)*100;
            table[i].validatedspend = Math.ceil(p1)+"%";
            let p2 = (table[i].map/grandMap)*100;
            table[i].map = Math.ceil(p2)+"%";
            let p3 = (table[i].l4validation/grandL4validation)*100;
            table[i].l4validation = Math.ceil(p3)+"%";
        }

        var data1 = await poolConnection.request().query(`SELECT COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS [Ok by default],COUNT(case when [Proposed Status] = 'Change Category' then 1 else null end) AS [Change Category],COUNT(case when [Proposed Status] = 'Review Later' then 1 else null end) AS [Review Later]
        FROM [DevOps].[ValidationData]`);
        data1 = data1.recordsets[0][0];

        var data2 = await poolConnection.request().query(`SELECT [Company Code],SUM(Sum_of_Grand_Total)
        FROM [DevOps].[ValidationTable] GROUP BY [Company Code]`);
        data2 = data2.recordsets[0];
        let sum=0;
        for(let i=0; i<data2.length; i++){
            sum = sum+data2[i][""];
        }
        let ar1=[],ar2=[];
        for(let i=0; i<data2.length; i++){
            let p = (data2[i][""]/sum)*100;
            ar1.push(data2[i]["Company Code"]);
            ar2.push(Math.ceil(p));
        }

        let result={
            table:table,
            status:data1,
            categoryByEntity:{
                label:ar1,
                data:ar2
            }
        };

        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: result });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = {
    validationData,validationShortTable
};
