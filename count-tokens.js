const fs = require('fs');
const { countTokens } = require('@anthropic-ai/tokenizer');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');
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
            data = (await mammoth.extractRawText({ path: filename })).value;
        } else if (extension === '.csv') {
            data = Papa.parse(fs.readFileSync(filename, 'utf8')).data.map(row => row.join(' ')).join('\n');
        } else if (extension === '.xlsx') {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filename);
            const worksheet = workbook.worksheets[0];

            // Convert to CSV format
            let csvData = '';
            worksheet.eachRow((row, rowNumber) => {
                const values = [];
                row.eachCell({ includeEmpty: true }, (cell) => {
                    values.push(cell.value || '');
                });
                csvData += values.join(',') + '\n';
            });
            data = csvData;
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
