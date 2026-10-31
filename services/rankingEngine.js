// services/rankingEngine.js
const db = require('../database/db');

/**
 * Generate JoSAA Choice Filling List
 * @param {Object} inputs
 * @param {number} inputs.jeeMainRank
 * @param {number} [inputs.jeeAdvRank]
 * @param {string} inputs.category - OPEN, EWS, OBC-NCL, SC, ST
 * @param {string} inputs.genderPool - Gender-Neutral, Female-only
 * @param {string} inputs.homeState - e.g. 'Rajasthan', 'Delhi', 'Maharashtra'
 * @param {Array<string>} inputs.priorityOrder - e.g. ['branch', 'nirf', 'placement']
 * @param {Array<string>} inputs.selectedBranches - canonical branch names in preferred order
 * @param {string} [inputs.instituteType] - 'ALL', 'IIT', 'NIT'
 * @param {boolean} [inputs.ambitiousOnTop=true] - Place ambitious choices first within groups
 * @param {number} [inputs.maxChoices=300]
 */
function generateChoiceList(inputs) {
  const {
    jeeMainRank = 15000,
    jeeAdvRank = null,
    category = 'OPEN',
    genderPool = 'Gender-Neutral',
    homeState = '',
    priorityOrder = ['branch', 'nirf', 'placement'],
    selectedBranches = [],
    instituteType = 'ALL',
    ambitiousOnTop = true,
    maxChoices = 300
  } = inputs;

  const mainRank = parseInt(jeeMainRank, 10) || 15000;
  const advRank = jeeAdvRank ? parseInt(jeeAdvRank, 10) : null;

  // Build query to fetch closing ranks with institute and branch details
  let query = `
    SELECT 
      cr.id AS closing_rank_id,
      cr.program_id,
      cr.year,
      cr.round,
      cr.quota,
      cr.seat_type,
      cr.gender_pool,
      cr.opening_rank,
      cr.closing_rank,
      cr.source_url AS cutoff_source,
      p.original_name AS program_name,
      p.duration_years,
      p.degree,
      p.seats,
      i.id AS institute_id,
      i.name AS institute_name,
      i.type AS institute_type,
      i.josaa_code,
      i.city,
      i.state AS institute_state,
      i.annual_fee,
      i.website,
      b.id AS branch_id,
      b.canonical_name AS branch_name,
      b.group_name AS branch_group,
      COALESCE(nr.rank, 999) AS nirf_rank,
      COALESCE(nr.score, 0) AS nirf_score,
      COALESCE(pl.average_package_lpa, 0) AS avg_placement_lpa,
      COALESCE(pl.median_package_lpa, 0) AS median_placement_lpa,
      COALESCE(pl.highest_package_lpa, 0) AS highest_placement_lpa,
      COALESCE(pl.placement_percent, 0) AS placement_percent
    FROM closing_ranks cr
    JOIN programs p ON cr.program_id = p.id
    JOIN institutes i ON p.institute_id = i.id
    JOIN branches b ON p.branch_id = b.id
    LEFT JOIN nirf_rankings nr ON (i.id = nr.institute_id AND nr.category = 'Engineering' AND nr.year = 2024)
    LEFT JOIN placements pl ON (i.id = pl.institute_id AND pl.year = 2024)
    WHERE cr.seat_type = ?
      AND (cr.gender_pool = ? OR cr.gender_pool = 'Gender-Neutral')
  `;

  const queryParams = [category, genderPool];

  // Institute Type Filter
  if (instituteType === 'IIT') {
    query += ` AND i.type = 'IIT'`;
  } else if (instituteType === 'NIT') {
    query += ` AND i.type = 'NIT'`;
  }

  // Quota handling: IITs are AI; NITs have HS for home state, OS for other states
  // We query all and filter in JS or SQL
  const rows = db.prepare(query).all(...queryParams);

  // Filter based on Quota & Rank
  const candidates = [];

  for (const row of rows) {
    // Branch filter if user selected specific branches
    if (selectedBranches && selectedBranches.length > 0) {
      if (!selectedBranches.includes(row.branch_name)) {
        continue;
      }
    }

    // Determine relevant rank for this institute type
    let userRank;
    if (row.institute_type === 'IIT') {
      if (!advRank || advRank <= 0) {
        // If student did not provide JEE Advanced rank, skip IITs
        continue;
      }
      userRank = advRank;
      if (row.quota !== 'AI') continue;
    } else {
      userRank = mainRank;
      // NIT Quota Check
      const isHomeState = homeState && row.institute_state.toLowerCase().trim() === homeState.toLowerCase().trim();
      if (isHomeState) {
        // Must match HS quota (or OS if better)
        if (row.quota !== 'HS' && row.quota !== 'OS') continue;
      } else {
        // Must match OS quota
        if (row.quota !== 'OS') continue;
      }
    }

    const cutoff = row.closing_rank;

    // Eligibility & Chance Classification
    // Safe: userRank < cutoff * 0.85 (Rank is safely better than cutoff)
    // Moderate: userRank between cutoff * 0.85 and cutoff * 1.15
    // Ambitious: userRank between cutoff * 1.15 and cutoff * 1.45 (Reach choice)
    let chanceLabel = '';
    let chanceScore = 0; // For secondary sorting if ambitious on top

    if (userRank <= cutoff * 0.85) {
      chanceLabel = 'Safe';
      chanceScore = 1;
    } else if (userRank <= cutoff * 1.15) {
      chanceLabel = 'Moderate';
      chanceScore = 2;
    } else if (userRank <= cutoff * 1.45) {
      chanceLabel = 'Ambitious';
      chanceScore = 3;
    } else {
      // Beyond reach (> 45% gap)
      continue;
    }

    // Branch preference index
    let branchPriorityIdx = 999;
    if (selectedBranches && selectedBranches.length > 0) {
      const idx = selectedBranches.indexOf(row.branch_name);
      if (idx !== -1) branchPriorityIdx = idx;
    }

    candidates.push({
      ...row,
      user_rank_used: userRank,
      chance: chanceLabel,
      chanceScore: chanceScore,
      branch_priority_idx: branchPriorityIdx
    });
  }

  // Sort candidates according to user's priority order:
  // e.g. ['branch', 'nirf', 'placement']
  // If ambitiousOnTop is true, within identical primary groups, Ambitious > Moderate > Safe
  candidates.sort((a, b) => {
    for (const criterion of priorityOrder) {
      if (criterion === 'branch') {
        if (a.branch_priority_idx !== b.branch_priority_idx) {
          return a.branch_priority_idx - b.branch_priority_idx;
        }
      } else if (criterion === 'nirf') {
        if (a.nirf_rank !== b.nirf_rank) {
          return a.nirf_rank - b.nirf_rank; // 1, 2, 3...
        }
      } else if (criterion === 'placement') {
        if (a.avg_placement_lpa !== b.avg_placement_lpa) {
          return b.avg_placement_lpa - a.avg_placement_lpa; // highest first
        }
      }
    }

    // Ambitious on top option within tier
    if (ambitiousOnTop) {
      if (b.chanceScore !== a.chanceScore) {
        return b.chanceScore - a.chanceScore; // 3 (Ambitious), 2 (Moderate), 1 (Safe)
      }
    }

    // Fallback sort by cutoff rank closeness
    return a.closing_rank - b.closing_rank;
  });

  // Limit to maxChoices
  const finalChoices = candidates.slice(0, maxChoices);

  // Assign sequence numbers (1, 2, 3...)
  const numberedChoices = finalChoices.map((choice, index) => ({
    choice_number: index + 1,
    ...choice
  }));

  // Statistics summary
  const summary = {
    totalChoices: numberedChoices.length,
    safeCount: numberedChoices.filter(c => c.chance === 'Safe').length,
    moderateCount: numberedChoices.filter(c => c.chance === 'Moderate').length,
    ambitiousCount: numberedChoices.filter(c => c.chance === 'Ambitious').length,
    iitCount: numberedChoices.filter(c => c.institute_type === 'IIT').length,
    nitCount: numberedChoices.filter(c => c.institute_type === 'NIT').length,
    dataYear: 2024
  };

  return {
    inputs: {
      jeeMainRank: mainRank,
      jeeAdvRank: advRank,
      category,
      genderPool,
      homeState,
      priorityOrder,
      selectedBranches,
      instituteType,
      ambitiousOnTop
    },
    summary,
    choices: numberedChoices
  };
}

module.exports = {
  generateChoiceList
};
