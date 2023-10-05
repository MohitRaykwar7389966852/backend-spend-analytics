require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");

const validationData = async function (req, res) {
    try {
        const inClause = req.inClause;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        let [grand,table,data1,data2] = await Promise.all([
            poolConnection.request().query(`SELECT SUM(Sum_of_Grand_Total) AS grandTotal,COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS grandMap,COUNT(case when [New  L4 - Global Procurement] = null then 0 else 1 end) AS grandL4validation
            FROM [DevOps].[ValidationTable]`),
            poolConnection.request().query(`SELECT [Company Code],SUM(Sum_of_Grand_Total) AS spend,COUNT(DISTINCT [Supplier Parent Name]) AS supplier,SUM(CASE WHEN [New  L4 - Global Procurement] = null THEN 0 ELSE Sum_of_Grand_Total END) AS validatedspend,COUNT(CASE WHEN [New  L4 - Global Procurement] = null THEN 0 ELSE Sum_of_Grand_Total END) AS pid,COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS map,COUNT(case when [New  L4 - Global Procurement] = null then 0 else 1 end) AS l4validation
            FROM [DevOps].[ValidationTable] GROUP BY [Company Code]`),
            poolConnection.request().query(`SELECT COUNT(case when [Proposed Status] = 'Ok by default' then 1 else null end) AS [Ok by default],COUNT(case when [Proposed Status] = 'Change Category' then 1 else null end) AS [Change Category],COUNT(case when [Proposed Status] = 'Review Later' then 1 else null end) AS [Review Later]
            FROM [DevOps].[ValidationData]`),
            poolConnection.request().query(`SELECT [Company Code],SUM(Sum_of_Grand_Total)
            FROM [DevOps].[ValidationTable] GROUP BY [Company Code]`)
        ]);

        let grandTotal = grand.recordsets[0][0]["grandTotal"];
        let grandMap = grand.recordsets[0][0]["grandMap"];
        let grandL4validation = grand.recordsets[0][0]["grandL4validation"];
        table = table.recordsets[0];

        for(let i = 0; i < table.length; i++){
            table[i].validatedspend = ((table[i].validatedspend / grandTotal) * 100).toFixed(2) + "%";
            table[i].map = ((table[i].map / grandMap) * 100).toFixed(2) + "%";
            table[i].l4validation = ((table[i].l4validation / grandL4validation) * 100).toFixed(2) + "%";
        }
        
        data1 = data1.recordsets[0][0];
        data2 = data2.recordsets[0];
        let sum = 0;
        let ar1 = [];
        let ar2 = [];
        for (let i = 0; i < data2.length; i++) {
            let value = data2[i][""];
            sum += value;
            ar1.push(data2[i]["Company Code"]);
            ar2.push(Math.ceil((value / sum) * 100));
        }
        // let sum=0;
        // for(let i=0; i<data2.length; i++){
        //     sum = sum+data2[i][""];
        // }
        // let ar1=[],ar2=[];
        // for(let i=0; i<data2.length; i++){
        //     let p = (data2[i][""]/sum)*100;
        //     ar1.push(data2[i]["Company Code"]);
        //     ar2.push(Math.ceil(p));
        // }

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

const validationMainTable = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");

        let data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ValidationTable]`);
        
        data = data.recordsets[0];

        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data , message:"validation main table data fetched successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = {
    validationData,validationMainTable
};
