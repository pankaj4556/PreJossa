// services/excelExporter.js
const ExcelJS = require('exceljs');

async function exportToExcel(choiceListData, res) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JoSAAPrep';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('JoSAA Choice List', {
    views: [{ showGridLines: true }]
  });

  const { inputs, summary, choices } = choiceListData;

  // Title Block
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'JoSAA 2024-25 Choice Filling Sequence';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // Metadata Block
  worksheet.mergeCells('A2:I2');
  const metaCell = worksheet.getCell('A2');
  const adv = inputs.jeeAdvRank ? ` | JEE Advanced Rank: ${inputs.jeeAdvRank}` : '';
  metaCell.value = `JEE Main Rank: ${inputs.jeeMainRank}${adv} | Category: ${inputs.category} | Gender: ${inputs.genderPool} | Home State: ${inputs.homeState || 'All India'} | Total Choices: ${choices.length}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Blank row

  // Table Columns
  worksheet.columns = [
    { header: 'Choice #', key: 'choice_number', width: 10 },
    { header: 'Institute Name', key: 'institute_name', width: 40 },
    { header: 'Institute Code', key: 'josaa_code', width: 15 },
    { header: 'Academic Program / Branch', key: 'branch_name', width: 36 },
    { header: 'Quota', key: 'quota', width: 10 },
    { header: 'Seat Type', key: 'seat_type', width: 12 },
    { header: 'Previous Cutoff Rank', key: 'closing_rank', width: 20 },
    { header: 'Chance', key: 'chance', width: 14 },
    { header: 'NIRF Engineering Rank', key: 'nirf_rank', width: 22 },
    { header: 'Avg Placement (LPA)', key: 'avg_placement_lpa', width: 20 }
  ];

  // Style Header Row (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Add Data Rows
  choices.forEach((choice, index) => {
    const row = worksheet.addRow({
      choice_number: choice.choice_number,
      institute_name: choice.institute_name,
      josaa_code: choice.josaa_code,
      branch_name: choice.branch_name,
      quota: choice.quota || 'AI',
      seat_type: choice.seat_type || inputs.category,
      closing_rank: choice.closing_rank,
      chance: choice.chance,
      nirf_rank: choice.nirf_rank ? `#${choice.nirf_rank}` : 'N/A',
      avg_placement_lpa: choice.avg_placement_lpa ? `₹${choice.avg_placement_lpa} LPA` : 'N/A'
    });

    row.height = 20;
    const isEven = index % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 5 || colNumber === 8 ? 'center' : 'left' };
      if (!isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // Chance styling
      if (colNumber === 8) {
        if (choice.chance === 'Safe') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
        } else if (choice.chance === 'Moderate') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
        } else {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
        }
      }
    });
  });

  await workbook.xlsx.write(res);
}

module.exports = { exportToExcel };
