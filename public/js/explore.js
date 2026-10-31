// public/js/explore.js
// Client-side College Explorer Controller with debounced live search, sorting, and active filter chips

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const typeBtns = document.querySelectorAll('.type-filter-btn');
  const stateFilter = document.getElementById('stateFilter');
  const branchFilter = document.getElementById('branchFilter');
  const nirfFilter = document.getElementById('nirfFilter');
  const placementFilter = document.getElementById('placementFilter');
  const sortBy = document.getElementById('sortBy');
  const collegesGrid = document.getElementById('collegesGrid');
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const resetBtn = document.getElementById('resetFiltersBtn');
  const activeChipsContainer = document.getElementById('activeFilterChipsContainer');
  const activeChipsList = document.getElementById('activeChipsList');
  const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');

  if (!collegesGrid) return;

  let currentType = 'ALL';
  let allColleges = [];
  let debounceTimer = null;

  function updateActiveChips() {
    if (!activeChipsContainer || !activeChipsList) return;

    const chips = [];
    const q = searchInput.value.trim();
    if (q) {
      chips.push({ label: `Search: "${q}"`, reset: () => { searchInput.value = ''; fetchColleges(); } });
    }
    if (currentType !== 'ALL') {
      chips.push({ label: `Type: ${currentType}s`, reset: () => { typeBtns[0].click(); } });
    }
    if (stateFilter.value !== 'ALL') {
      chips.push({ label: `State: ${stateFilter.value}`, reset: () => { stateFilter.value = 'ALL'; fetchColleges(); } });
    }
    if (branchFilter.value !== 'ALL') {
      chips.push({ label: `Branch: ${branchFilter.value}`, reset: () => { branchFilter.value = 'ALL'; fetchColleges(); } });
    }
    if (nirfFilter.value !== '999') {
      chips.push({ label: `NIRF: Top ${nirfFilter.value}`, reset: () => { nirfFilter.value = '999'; fetchColleges(); } });
    }
    if (placementFilter.value !== '0') {
      chips.push({ label: `Min CTC: ₹${placementFilter.value}+ LPA`, reset: () => { placementFilter.value = '0'; fetchColleges(); } });
    }

    if (chips.length === 0) {
      activeChipsContainer.classList.add('hidden');
      activeChipsList.innerHTML = '';
    } else {
      activeChipsContainer.classList.remove('hidden');
      activeChipsList.innerHTML = '';
      chips.forEach(chip => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition text-[11px] font-medium';
        btn.innerHTML = `<span>${chip.label}</span><span class="text-blue-500 font-bold ml-1">×</span>`;
        btn.addEventListener('click', chip.reset);
        activeChipsList.appendChild(btn);
      });
    }
  }

  async function fetchColleges() {
    updateActiveChips();

    const q = searchInput.value.trim();
    const state = stateFilter.value;
    const branch = branchFilter.value;
    const nirfMax = nirfFilter.value;
    const minLpa = placementFilter.value;

    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (currentType !== 'ALL') params.append('type', currentType);
    if (state !== 'ALL') params.append('state', state);
    if (branch !== 'ALL') params.append('branch', branch);
    if (nirfMax !== '999') params.append('nirfMax', nirfMax);
    if (minLpa !== '0') params.append('minLpa', minLpa);

    try {
      resultsCount.innerHTML = '<span class="text-slate-400">Filtering institutes...</span>';
      const res = await fetch(`/api/colleges?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        allColleges = data.colleges;
        renderColleges();
      }
    } catch (err) {
      console.error('Error fetching colleges:', err);
      resultsCount.innerHTML = '<span class="text-rose-500">Error loading institutes</span>';
    }
  }

  function renderColleges() {
    // Sort
    const sortVal = sortBy.value;
    const sorted = [...allColleges].sort((a, b) => {
      if (sortVal === 'nirf') {
        const aRank = a.nirf_rank ? a.nirf_rank : 999;
        const bRank = b.nirf_rank ? b.nirf_rank : 999;
        return aRank - bRank;
      }
      if (sortVal === 'placement') {
        const aPl = a.avg_placement_lpa ? parseFloat(a.avg_placement_lpa) : 0;
        const bPl = b.avg_placement_lpa ? parseFloat(b.avg_placement_lpa) : 0;
        return bPl - aPl;
      }
      if (sortVal === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    resultsCount.innerHTML = `
      <span class="text-slate-900 font-extrabold font-mono text-sm">${sorted.length}</span>
      <span class="text-slate-500 font-normal">of 54 Institutes Matching Criteria</span>
    `;

    if (sorted.length === 0) {
      collegesGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    collegesGrid.innerHTML = sorted.map(inst => {
      const isIIT = inst.type === 'IIT';
      const typeBadgeClass = isIIT 
        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80' 
        : 'bg-amber-50 text-amber-800 border border-amber-200/80';
      
      const nirfRank = inst.nirf_rank;
      const nirfBadge = nirfRank 
        ? `<span class="text-xs font-bold font-mono px-2.5 py-0.5 rounded-lg ${nirfRank <= 10 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'}">NIRF #${nirfRank}</span>`
        : `<span class="text-xs text-slate-400 font-mono">Unranked</span>`;

      const avgLpa = inst.avg_placement_lpa ? `₹${inst.avg_placement_lpa} LPA` : 'N/A';
      const highestLpa = inst.highest_placement_lpa ? `₹${inst.highest_placement_lpa} LPA` : 'N/A';

      return `
        <div class="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col justify-between group">
          <div>
            <!-- Top badge row -->
            <div class="flex items-center justify-between mb-3">
              <span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wider ${typeBadgeClass}">
                ${inst.type} • ${inst.josaa_code}
              </span>
              ${nirfBadge}
            </div>

            <!-- College Name -->
            <h3 class="text-base font-bold text-slate-900 mb-1 leading-snug line-clamp-2 group-hover:text-blue-600 transition">
              ${inst.name}
            </h3>

            <!-- Location -->
            <p class="text-xs text-slate-500 mb-4 flex items-center space-x-1.5">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
              <span>${inst.city}, ${inst.state}</span>
            </p>

            <!-- Placement Box -->
            <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Avg Package</span>
                <span class="font-extrabold text-slate-900 font-mono text-sm">${avgLpa}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Highest Package</span>
                <span class="font-extrabold text-slate-900 font-mono text-sm">${highestLpa}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Footer -->
          <div class="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-[11px] text-slate-400 font-mono">Est. ${inst.established_year || '-'}</span>
            <a href="/college/${inst.josaa_code}" class="font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
              <span>View Cutoffs</span>
              <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </a>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Type filter toggle buttons
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => {
        b.className = 'type-filter-btn flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition';
      });
      btn.className = 'type-filter-btn flex-1 py-2 rounded-xl bg-white shadow-xs text-blue-700 transition';
      currentType = btn.dataset.type;
      fetchColleges();
    });
  });

  // Debounced search input
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchColleges, 250);
  });

  // Select dropdown filters
  stateFilter.addEventListener('change', fetchColleges);
  branchFilter.addEventListener('change', fetchColleges);
  nirfFilter.addEventListener('change', fetchColleges);
  placementFilter.addEventListener('change', fetchColleges);
  sortBy.addEventListener('change', renderColleges);

  function resetAll() {
    searchInput.value = '';
    currentType = 'ALL';
    typeBtns.forEach(b => {
      b.className = 'type-filter-btn flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition';
    });
    typeBtns[0].className = 'type-filter-btn flex-1 py-2 rounded-xl bg-white shadow-xs text-blue-700 transition';
    stateFilter.value = 'ALL';
    branchFilter.value = 'ALL';
    nirfFilter.value = '999';
    placementFilter.value = '0';
    fetchColleges();
  }

  if (resetBtn) resetBtn.addEventListener('click', resetAll);
  if (clearAllFiltersBtn) clearAllFiltersBtn.addEventListener('click', resetAll);

  // Initial load
  fetchColleges();
});
