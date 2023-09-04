require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10;

function generateRandomPassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
  
    return password;
  }

const brandList = async function (req, res) {
    try {
        const user = req.userDetails;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT DISTINCT(Company) AS title
        FROM DevOps.ExcessRights`);
        data=data.recordset;
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:data, message:"Brand List Fetched successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const clientList = async function (req, res) {
    try {
        // const user = req.userDetails;
        const brand = req.query.brand;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT Email AS title
        FROM DevOps.ExcessRights WHERE Company = '${brand}'`);
        data=data.recordset;
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:data, message:"Access Data successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const tableList = async function (req, res) {
    try {
        const user = req.userDetails;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT table_name
        FROM INFORMATION_SCHEMA.TABLES
        WHERE table_type = 'BASE TABLE'
        AND table_schema = 'DevOps'`);
        data=data.recordset;
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:data, message:"Access Data successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const tableColumn = async function (req, res) {
    try {
        const tableName = req.query.tableName;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'`);
        data=data.recordset;
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:data, message:"Access Data successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const columnValue = async function (req, res) {
    try {
        const columnName = req.query.columnName;
        const tableName = req.query.tableName;
        const condition = req.query.condition;
        let arr = condition.split('"');
        let str = arr.join("'");
        var poolConnection = await sql.connect(config);
        console.log("connected");

        console.log(str);
        

        var data = await poolConnection.request().query(`SELECT DISTINCT([${columnName}]) AS title
        FROM DevOps.${tableName} ${str}`);
        data=data.recordset;

        console.log(data);
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:data, message:"Access Data successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const addRight = async function (req, res) {
    try {
        const query = req.query.query;
        const mail = req.query.email;
        console.log(mail);
        const table = req.query.table;
        let email = JSON.parse(mail);
        var poolConnection = await sql.connect(config);
        console.log("connected");

        // email clause
        const values = email.map((value) => `'${value}'`).join(', ');
        let Clause =  `WHERE Email IN (${values})`;
        console.log(Clause);

        var data1 = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ExcessRights] ${Clause}`);
        data1 = data1.recordset;

        let arr = [];
        data1.map(x=>{
            let obj;
            if(x.Access == null) obj = '{}';
            else obj = x.Access;
            obj = JSON.parse(obj);
            obj[table] = query;
            arr.push([x.Email,obj]);
        });

        console.log(arr);

        for(let i=0; i<arr.length; i++){
            let accessEmail = arr[i][0];
            let access = arr[i][1];
            access = JSON.stringify(access);
            console.log(access);
            console.log(accessEmail);
            await poolConnection
            .request()
            .query(
                `UPDATE DevOps.ExcessRights SET  Access = '${access}' WHERE Email = '${accessEmail}'`
            ); 
        };


        //  await poolConnection
        //     .request()
        //     .query(
        //         `UPDATE DevOps.ExcessRights SET  Access = '{}' ${Clause}`
        //     );
        
        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ExcessRights]`);

        console.log(data);
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:data, message:"Access Data successfully" });
        
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const accessClient = async function (req, res) {
    try {
        const brand = req.query.brand;
        const table = req.query.table;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ExcessRights] WHERE Company = '${brand}'`);
        data = data.recordset;
        let arr=[];
        data.map(x=>{
        if( x.Access !== null){
            let access = x.Access;
            if(access == "global") return;
            else access == '{}';
            access = JSON.parse(access);
            console.log(access);
            let rights = access[table];
            if(rights){
                arr.push({
                    Email:x.Email,
                    Query:rights
                });
                console.log(arr);
            }
        }        
        });
        console.log(arr);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:arr, message:"Access Data successfully" }); 
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const userTable = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[ExcessRights]`);
        data = data.recordset;
        let arr = [];
        data.map(x=>{
                let access;
                if(x.Access == "global") access = "Global";
                else if(x.Access == null) access="No Access"
                else access = "Limited"
                arr.push({
                    name:x.Name,
                    email:x.Email,
                    company:x.Company,
                    job:x.Job,
                    location:x.Location,
                    access:access
                });
        });

        console.log(arr);
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({status:true,result:arr, message:"Access Data successfully" }); 
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const addUser = async function (req, res) {
    try {
        var poolConnection = await sql.connect(config);
        console.log("connected");

        console.log(req.body.userData);
        let data = req.body;
        data = JSON.parse(data.userData);

        for (const x of data) {
            console.log("started");
            console.log(x);
            const { name, email, company, job, location } = x;

            var maxid = await poolConnection.request().query(`SELECT max(Id) FROM [DevOps].[ExcessRights]`);
            let nextid = maxid.recordset[0][""] + 1;
            console.log("id - " + nextid);

            // Insert into ExcessRights table
            const accessInsert = await poolConnection.request().query(`INSERT INTO DevOps.ExcessRights 
                (Id, Name, Email, Company, Job, Location, AccessType)
                VALUES(${nextid},'${name}','${email}','${company}','${job}','${location}','user')
            `);
            console.log("access table insertion");
            console.log(accessInsert);

            // Generate random password and hash it
            const pass = generateRandomPassword(8);
            console.log(pass);
            const hashPass = bcrypt.hashSync(pass, saltRounds);
            console.log(hashPass);

            // Insert into Login_Table table
            const loginInsert = await poolConnection.request().query(`INSERT INTO DevOps.Login_Table 
                (Name, Email, Pass, Company, Job)
                VALUES('${name}','${email}','${hashPass}','${company}','${job}')
            `);
            console.log("login table insertion");
            console.log(loginInsert);
        }
        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ status: true, result: data, message: "Access Data successfully" }); 
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const sendCredentials = async function (req, res) {
    try {
        let brand = req.query.brand;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        var data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Login_Table] WHERE Company = '${brand}'`);
        data = data.recordset;

        let client=[];
        data.map(x=>{
            // client.push({
            //     Email:x.Email
            // });
            console.log();
        });

        console.log(data);

        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ status: true, result: data, message: "Access Data successfully" }); 
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};


module.exports = {
    brandList,clientList,tableList,tableColumn,columnValue,addRight,accessClient,userTable,addUser,sendCredentials
};