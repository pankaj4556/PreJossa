// public/js/generator.js
// PreJOSAA Choice List Generator â€” Priority-Ranked Branch Selector

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('generatorForm');
  if (!form) return;

  // â”€â”€ Step Elements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const step1        = document.getElementById('step1');
  const step2        = document.getElementById('step2');
  const step3        = document.getElementById('step3');
  const progressLine = document.getElementById('stepProgressLine');
  const indicators   = document.querySelectorAll('.step-indicator');

  const toStep2Btn     = document.getElementById('toStep2Btn');
  const backToStep1Btn = document.getElementById('backToStep1Btn');
  const toStep3Btn     = document.getElementById('toStep3Btn');
  const backToStep2Btn = document.getElementById('backToStep2Btn');
  const submitBtn      = document.getElementById('generateSubmitBtn');

  // â”€â”€ Branch Priority State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let selectedBranches = []; // ordered array

  const priorityTagsArea        = document.getElementById('priorityTagsArea');
  const priorityTagsPlaceholder = document.getElementById('priorityTagsPlaceholder');
  const selectedBranchesInputs  = document.getElementById('selectedBranchesInputs');
  const clearAllBtn             = document.getElementById('clearBranchesBtn');
  const branchesContainer       = document.getElementById('branchesContainer');
  const branchFilterChips       = document.querySelectorAll('.branch-filter-chip');

  let currentStep = 1;

  // â”€â”€ Step Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function setStep(stepNum) {
    currentStep = stepNum;
    step1.classList.add('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');

    if (stepNum === 1) {
      step1.classList.remove('hidden');
      progressLine.style.width = '0%';
    } else if (stepNum === 2) {
      step2.classList.remove('hidden');
      progressLine.style.width = '50%';
    } else if (stepNum === 3) {
      step3.classList.remove('hidden');
      progressLine.style.width = '100%';
    }

    indicators.forEach((ind) => {
      const num      = parseInt(ind.dataset.step, 10);
      const circle   = ind.querySelector('div');
      const text     = ind.querySelector('span');
      const stepIcon = ind.querySelector('.step-icon');
      if (num < stepNum) {
        circle.className = 'w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md transition-all group-hover:ring-4 group-hover:ring-emerald-100';
        text.className   = 'text-xs font-bold text-slate-800 mt-2';
        if (stepIcon) stepIcon.innerHTML = '&#10003;';
      } else if (num === stepNum) {
        circle.className = 'w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md transition-all group-hover:ring-4 group-hover:ring-blue-100';
        text.className   = 'text-xs font-bold text-blue-700 mt-2';
        if (stepIcon) stepIcon.textContent = String(num);
      } else {
        circle.className = 'w-10 h-10 rounded-full bg-white border-2 border-slate-300 text-slate-500 flex items-center justify-center font-bold text-sm shadow-xs transition-all group-hover:border-slate-400';
        text.className   = 'text-xs font-semibold text-slate-400 mt-2';
        if (stepIcon) stepIcon.textContent = String(num);
      }
    });

    window.scrollTo({ top: 120, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  }

  // Stepper circle clicks
  indicators.forEach(ind => {
    ind.addEventListener('click', () => {
      const t = parseInt(ind.dataset.step, 10);
      if (t === 1)      setStep(1);
      else if (t === 2) { if (validateStep1()) setStep(2); }
      else if (t === 3) { if (validateStep1()) setStep(3); }
    });
  });

  // â”€â”€ Institute Type Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const instTypeRadios   = document.querySelectorAll('input[name="instituteType"]');
  const instTypeCards    = document.querySelectorAll('.inst-type-card');
  const jeeAdvBadge      = document.getElementById('jeeAdvRequiredBadge');
  const jeeAdvHelperText = document.getElementById('jeeAdvHelperText');

  instTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      instTypeCards.forEach(card => {
        card.classList.remove('border-blue-600', 'bg-blue-50/50', 'shadow-xs');
        card.classList.add('border-slate-200', 'bg-white');
      });
      const sel = radio.closest('.inst-type-card');
      if (sel) {
        sel.classList.remove('border-slate-200', 'bg-white');
        sel.classList.add('border-blue-600', 'bg-blue-50/50', 'shadow-xs');
      }
      if (radio.value === 'NIT') {
        if (jeeAdvBadge)      { jeeAdvBadge.textContent = 'Not required for NITs'; jeeAdvBadge.className = 'text-[11px] text-slate-400 font-medium'; }
        if (jeeAdvHelperText)   jeeAdvHelperText.textContent = 'NIT admissions rely solely on JEE Main CRL/Category rank.';
      } else {
        if (jeeAdvBadge)      { jeeAdvBadge.textContent = 'For IITs'; jeeAdvBadge.className = 'text-[11px] text-blue-600 font-medium'; }
        if (jeeAdvHelperText)   jeeAdvHelperText.textContent = 'Leave blank if you only qualified JEE Main for NITs.';
      }
    });
  });

  // â”€â”€ Step 1 Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function validateStep1() {
    const jeeMain   = document.getElementById('jeeMainRank').value;
    const homeState = document.getElementById('homeState').value;
    if (!jeeMain || parseInt(jeeMain, 10) <= 0) {
      alert('Please enter a valid JEE Main Rank.');
      document.getElementById('jeeMainRank').focus();
      return false;
    }
    if (!homeState) {
      alert('Please select your Home State to calculate Home State vs Other State quota.');
      document.getElementById('homeState').focus();
      return false;
    }
    return true;
  }

  toStep2Btn.addEventListener('click',    () => { if (validateStep1()) setStep(2); });
  backToStep1Btn.addEventListener('click', () => setStep(1));
  toStep3Btn.addEventListener('click',     () => setStep(3));
  backToStep2Btn.addEventListener('click', () => setStep(2));

  // â”€â”€ Priority Reorder (Step 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const priorityList = document.getElementById('priorityList');
  function updatePriorityNumbers() {
    const items = priorityList.querySelectorAll('.priority-item');
    items.forEach((item, idx) => {
      const rb = item.querySelector('.priority-rank');
      if (rb) {
        rb.textContent = String(idx + 1);
        rb.className = idx === 0
          ? 'priority-rank w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs'
          : 'priority-rank w-8 h-8 rounded-full bg-slate-600 text-white font-bold text-xs flex items-center justify-center shadow-xs';
      }
    });
  }

  priorityList.addEventListener('click', (e) => {
    const upBtn   = e.target.closest('.move-up-btn');
    const downBtn = e.target.closest('.move-down-btn');
    if (!upBtn && !downBtn) return;
    const cur = (upBtn || downBtn).closest('.priority-item');
    if (upBtn) {
      const prev = cur.previousElementSibling;
      if (prev) { priorityList.insertBefore(cur, prev); updatePriorityNumbers(); }
    } else {
      const next = cur.nextElementSibling;
      if (next) { priorityList.insertBefore(next, cur); updatePriorityNumbers(); }
    }
  });

  // â”€â”€ Branch Priority Tag System (Step 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function renderPriorityTags() {
    // Remove old tags
    priorityTagsArea.querySelectorAll('.priority-tag').forEach(t => t.remove());

    if (selectedBranches.length === 0) {
      if (priorityTagsPlaceholder) priorityTagsPlaceholder.style.display = '';
      priorityTagsArea.classList.remove('border-blue-300', 'bg-blue-50/30');
      priorityTagsArea.classList.add('border-slate-200', 'bg-slate-50/60');
    } else {
      if (priorityTagsPlaceholder) priorityTagsPlaceholder.style.display = 'none';
      priorityTagsArea.classList.add('border-blue-300', 'bg-blue-50/30');
      priorityTagsArea.classList.remove('border-slate-200', 'bg-slate-50/60');

      selectedBranches.forEach((name, i) => {
        const tag = document.createElement('span');
        tag.className = 'priority-tag inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm select-none animate-fadeIn';
        tag.dataset.name = name;
        tag.innerHTML = `
          <span style="opacity:.7;font-family:monospace;font-size:10px">${i + 1}.</span>
          <span>${escapeHtml(name)}</span>
          <button type="button" class="tag-remove-btn" title="Remove" style="margin-left:2px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.25);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:inherit;font-size:11px;line-height:1;transition:background 0.15s">&times;</button>
        `;
        priorityTagsArea.appendChild(tag);
      });
    }

    // Sync hidden inputs
    selectedBranchesInputs.innerHTML = '';
    selectedBranches.forEach(name => {
      const inp = document.createElement('input');
      inp.type  = 'hidden';
      inp.name  = 'selectedBranches';
      inp.value = name;
      selectedBranchesInputs.appendChild(inp);
    });

    // Dim / restore branch card buttons
    if (branchesContainer) {
      branchesContainer.querySelectorAll('.branch-card-btn').forEach(btn => {
        const isAdded = selectedBranches.includes(btn.dataset.name);
        const icon    = btn.querySelector('.branch-add-icon');
        if (isAdded) {
          btn.classList.add('opacity-40', 'pointer-events-none');
          if (icon) icon.textContent = '\u2713';
        } else {
          btn.classList.remove('opacity-40', 'pointer-events-none');
          if (icon) icon.textContent = '+';
        }
      });
    }
  }

  function addBranch(name) {
    if (!name || selectedBranches.includes(name)) return;
    selectedBranches.push(name);
    renderPriorityTags();
  }

  function removeBranch(name) {
    selectedBranches = selectedBranches.filter(b => b !== name);
    renderPriorityTags();
  }

  // Event delegation â€” add branch
  if (branchesContainer) {
    branchesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.branch-card-btn');
      if (!btn) return;
      addBranch(btn.dataset.name);
    });
  }

  // Event delegation â€” remove tag
  priorityTagsArea.addEventListener('click', (e) => {
    const rb = e.target.closest('.tag-remove-btn');
    if (!rb) return;
    const tag = rb.closest('.priority-tag');
    if (tag) removeBranch(tag.dataset.name);
  });

  // Clear all
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      selectedBranches = [];
      renderPriorityTags();
    });
  }

  // â”€â”€ Branch Filter Chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  branchFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      branchFilterChips.forEach(c => {
        c.classList.remove('active', 'bg-blue-600', 'text-white');
        c.classList.add('bg-slate-100', 'text-slate-700');
      });
      chip.classList.add('active', 'bg-blue-600', 'text-white');
      chip.classList.remove('bg-slate-100', 'text-slate-700');

      const group = chip.dataset.group;
      if (branchesContainer) {
        branchesContainer.querySelectorAll('.branch-card-btn').forEach(btn => {
          btn.style.display = (group === 'ALL' || btn.dataset.group === group) ? '' : 'none';
        });
      }
    });
  });

  // â”€â”€ Form Submission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedBranches.length === 0) {
      alert('Please select at least one branch for your choice list by clicking the branches listed below.');
      setStep(3);
      return;
    }

    const priorityItems = priorityList.querySelectorAll('.priority-item');
    const priorityOrder = Array.from(priorityItems).map(item => item.dataset.id);

    const formData = {
      jeeMainRank:      parseInt(document.getElementById('jeeMainRank').value, 10),
      jeeAdvRank:       document.getElementById('jeeAdvRank').value ? parseInt(document.getElementById('jeeAdvRank').value, 10) : null,
      category:         document.getElementById('category').value,
      genderPool:       document.getElementById('genderPool').value,
      homeState:        document.getElementById('homeState').value,
      instituteType:    form.querySelector('input[name="instituteType"]:checked').value,
      priorityOrder:    priorityOrder,
      selectedBranches: selectedBranches,
      ambitiousOnTop:   document.getElementById('ambitiousOnTop').checked
    };

    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Running 10,660+ Cutoff Engine...</span>
    `;

    try {
      const res  = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success && data.choiceListId) {
        window.location.href = `/result/${data.choiceListId}`;
      } else {
        alert(data.message || 'Error generating choice list.');
        resetSubmitBtn();
      }
    } catch (err) {
      console.error(err);
      alert('Network or server error while generating your list.');
      resetSubmitBtn();
    }
  });

  function resetSubmitBtn() {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
    submitBtn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4"></i><span>Generate My Choice List</span>`;
    if (window.lucide) window.lucide.createIcons();
  }

  // â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  renderPriorityTags();
});

