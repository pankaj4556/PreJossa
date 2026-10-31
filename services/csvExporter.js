// services/csvExporter.js

function exportToCsv(choiceListData, res) {
  const { choices, inputs } = choiceListData;

  // RFC 4180 CSV Header
  const headers = [
    'Choice Number',
    'Institute Name',
    'Institute Code',
    'Branch Name',
    'Degree',
    'Quota',
    'Seat Type',
    'Gender Pool',
    'Closing Rank',
    'Chance',
    'NIRF Engineering Rank',
    'Average Placement (LPA)'
  ];

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  let csvContent = headers.map(escapeCsv).join(',') + '\r\n';

  choices.forEach((choice) => {
    const row = [
      choice.choice_number,
      choice.institute_name,
      choice.josaa_code,
      choice.branch_name,
      choice.degree || 'B.Tech',
      choice.quota || 'AI',
      choice.seat_type || inputs.category,
      choice.gender_pool || inputs.genderPool,
      choice.closing_rank,
      choice.chance,
      choice.nirf_rank || '',
      choice.avg_placement_lpa || ''
    ];
    csvContent += row.map(escapeCsv).join(',') + '\r\n';
  });

  res.write(csvContent);
  res.end();
}

module.exports = { exportToCsv };
