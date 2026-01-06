const fs = require('fs');
const { countTokens } = require('@anthropic-ai/tokenizer');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const path = require('path');

if (process.argv.length < 3) {
    console.error('Usage: node count-tokens.js <filename>');
    process.exit(1);
}

const filename = process.argv[2];
const extension = path.extname(filename).toLowerCase();

const processFile = async () => {
    try {
        let data = '';
        if (extension === '.pdf') {
            const dataBuffer = fs.readFileSync(filename);
            const parser = new PDFParse({ data: dataBuffer });
            const pdfData = await parser.getText();
            data = pdfData.text;
        } else if (extension === '.docx') {
            const result = await mammoth.extractRawText({ path: filename });
            data = result.value;
        } else if (extension === '.csv') {
            const fileContent = fs.readFileSync(filename, 'utf8');
            const result = Papa.parse(fileContent);
            data = result.data.map(row => row.join(' ')).join('\n');
        } else if (extension === '.xlsx') {
            const workbook = XLSX.readFile(filename);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_csv(worksheet);
        } else if (extension === '.md') {
            data = fs.readFileSync(filename, 'utf8');
        } else {
            data = fs.readFileSync(filename, 'utf8');
        }

        const tokenCount = countTokens(data);
        console.log(`The file "${filename}" has ${tokenCount} tokens.`);
    } catch (err) {
        console.error(`Error processing file: ${err.message}`);
        process.exit(1);
    }
};

processFile();
