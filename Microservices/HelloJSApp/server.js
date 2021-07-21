/*jshint esversion: 6 */

const Http = require("http");
const Express = require("./node_modules/express");
const BodyParser = require("./node_modules/body-parser");
const MongoClient = require("./node_modules/mongodb").MongoClient;

let express = Express();
let server = Http.createServer(express);

express.use(BodyParser.json
({
    
}));

express.use(BodyParser.urlencoded
({
    
    extended: true

}));

express.get("/", (request, response) =>
{

    const message = "hello world-spark-2021"
    response.send("HelloJSApp - " + message + "\n\n");

});

express.get("/fetch", (request, response) =>
{

    const url = "mongodb://workshopmongodb:dpGUILF7fRrUINfauDjw5Swh287GUOXWtoiypFHLlCYaOoPeBqQeTi7kgKOMsISESMyp4GDiw8TtFNT26kvqwA%3D%3D@workshopmongodb.documents.azure.com:10255/?ssl=true";
    const dbName = "WorkshopDB";

    MongoClient.connect(url, (err, client) =>
    {

        if (err !== null)                            
            return;

        const db = client.db(dbName);// added coment
        const collection = db.collection("WorkshopCollection");
        collection.find({}).toArray((err, docs) =>
        {

            if (err !== null)
                return;

            console.log(docs);
            response.send("HelloJSApp - " + docs + "\n\n");
            
        });

    });
});

express.post("/upload", (request, response) =>
{

    response.send("HelloJSApp - Upload\n" + JSON.stringify(request.body) + "\n");
    
});

var port = process.env.port || process.env.PORT || 6001;
server.listen(port);

console.log("Server running at http://localhost:%d", port);
