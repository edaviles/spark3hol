/*jshint esversion: 6 */

const Http = require("http");
const Express = require("./node_modules/express");
const BodyParser = require("./node_modules/body-parser");

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

    const message = "spark-2021-GET"
    response.send("HelloJSApp - " + message + "\n\n");

});

express.post("/upload", (request, response) =>
{

    const message = "spark-2021-POST"
    response.send("HelloJSApp - " + message + JSON.stringify(request.body) + "\n");
    
});

var port = process.env.port || process.env.PORT || 6001;
server.listen(port);

console.log("Server running at http://localhost:%d", port);
