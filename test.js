const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://beltsadmin:BeltsAdminPass12@cluster0.2fn4tnq.mongodb.net/beltsdb?retryWrites=true&w=majority&appName=Cluster0"

async function test() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("✅ Connected successfully!");
        await client.close();
    } catch (err) {
        console.error("❌ Connection failed:");
        console.error(err);
    }
}

test();