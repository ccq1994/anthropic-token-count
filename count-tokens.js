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

/**
 * Extract text value from an ExcelJS cell, handling all cell value types
 * @param {Object} cell - ExcelJS cell object
 * @returns {string} - Text representation of the cell value
 */
function getCellText(cell) {
    const value = cell.value;

    // Handle null/undefined
    if (value == null) {
        return '';
    }

    // Handle primitive types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    // Handle Date objects
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Handle formula cells - use the result value, not the formula
    if (value.formula !== undefined) {
        const result = value.result;
        if (result == null) return '';
        if (result instanceof Date) return result.toISOString();
        if (typeof result === 'object' && result.error) return result.error;
        return String(result);
    }

    // Handle shared formula cells
    if (value.sharedFormula !== undefined) {
        const result = value.result;
        if (result == null) return '';
        if (result instanceof Date) return result.toISOString();
        if (typeof result === 'object' && result.error) return result.error;
        return String(result);
    }

    // Handle rich text - concatenate all text segments
    if (value.richText) {
        return value.richText.map(segment => segment.text).join('');
    }

    // Handle hyperlink cells - use the text, not the URL
    if (value.text !== undefined && value.hyperlink !== undefined) {
        return value.text;
    }

    // Handle error values
    if (value.error) {
        return value.error;
    }

    // Fallback for unknown types
    return String(value);
}

/**
 * Process the input file and count tokens
 * @returns {Promise<void>}
 */
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

            // Process all worksheets (not just the first one)
            const allRows = [];
            workbook.worksheets.forEach((worksheet, index) => {
                // Convert each row to array of cell text values
                worksheet.eachRow((row, rowNumber) => {
                    const values = [];
                    row.eachCell({ includeEmpty: true }, (cell) => {
                        values.push(getCellText(cell));
                    });
                    allRows.push(values);
                });
            });

            // Use PapaParse to generate properly escaped CSV
            data = Papa.unparse(allRows);
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
