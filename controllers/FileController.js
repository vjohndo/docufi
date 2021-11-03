const express = require("express");
const Users = require("../models/users");
const Files = require("../models/Files");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const pdf = require("pdf-extraction");
const fs = require('fs');
const azureAnalyzeText = require('../models/textAnalysis');
const {raw} = require("express");


router.use(express.json());

router.get("/:id", (req, res) => {
    res.json({message: "File Controller"});
})

// Get pending files
router.get("/:name", (req, res) => {

    res.json({message: "File Controller"});
})

// Endpoint for text analysis. Sample JSON request body = {documents = ["sentence 1", "sentence 2"]}
router.post("/", upload.array("files"), async (req, res) => {
    const user = await Users.getUserByEmail(req.session.email)
    const uploadedItems = [];

    for (let file of req.files) {
        const { originalname, filename, path, size, mimetype } = file;
        const fileInfo = {
            'FileName' : filename,
            'OriginalName' : originalname,
            'FilePath' : path,
            'FileSize' : size,
            'FileFormat' : mimetype,
            'DateUploaded' : new Date(Date.now()).toISOString(),
            'UserId' : user.id
        };

        let dataBuf = fs.readFileSync(file.path);
        const extractedData = await pdf(dataBuf);

        // Write fileInfo to the db after getting the results
        const dbResult = await Files.addFile(fileInfo);
        uploadedItems.push(fileInfo);

        const result = await analyzeAndProcessDocuments(extractedData.text);
        fileInfo.TextAnalysis = result;
        fileInfo.Processed = true;
        await Files.updateFileById(fileInfo, dbResult[0].id);
        // analyzeAndProcessDocuments(extractedData.text).then(async result => {
        //     fileInfo.TextAnalysis = result;
        //     await Files.updateFileById(fileInfo, dbResult[0].id);
        // })
        req.io.emit('fileAnalysisComplete', {"file" : fileInfo});

    }

    // verify # uploaded files were processed
    if (uploadedItems.length == Object.values(req.files).length) {
        res.json({
            message: "Uploaded successfully",
            fileInfo: uploadedItems
        });

    } else {
        res.status(406).json();
    }
});

// Need to look into this function!!!
async function analyzeAndProcessDocuments(text) {
    console.log("File recieved");
    // split extracted text to conform to AzureCS requirements
    text = text.replace(/(\s+)/gm, " ");
    const textArr = text.match(/.{1,5000}/g);

    // Call AAT Service
    console.log("Analysing Text");
    const rawResult = await azureAnalyzeText(textArr);

    console.log("Returning Results Text");
    // Output the raw result into the database
    return rawResult;
}

function dataSanatizing() {
                // Get and remove erroneous datasets
        const errors = [];
        for (const item in rawResult) {
            const collectionObject = rawResult[item];
            collectionObject.documents.forEach(obj => {
            if (obj.error) {
                errors.push(obj.error);
                rawResult[item].error = true;
                console.log(`Error in analysis: ${JSON.stringify(obj.error)}`)
            }
            });
        }

        // only take data with no errors 
        const sanitizedData = Object.entries(rawResult).filter(x => !x[1].error).map(x => {
            return { [x[0]] : [x[1]]  }
        })
        console.log('SANATIZED DATA:', sanitizedData);
        console.log('SANATIZED DATA:', sanitizedData[0]);
        console.log('SANATIZED DATA:', sanitizedData[0].sentiment);
    
        // Return if no data found
        if (sanitizedData.length < 1) {
            return {
                'success': false,
                'message': errors
            }
        }
    
        if (!sanitizedData) {
            console.log('No documents');
            return {
                'success': false,
                'message': 'No documents found in file'
            }
        }
    
        return {
            'success': true,
            'message': 'Documents analyzed successfully'
        }
}

module.exports = router;