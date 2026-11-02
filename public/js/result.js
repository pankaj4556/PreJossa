// public/js/result.js
// Interactive On-screen Table Editor, Risk Filters & Download Triggers

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('choiceTableBody');
  const saveBtn = document.getElementById('saveChangesBtn');
  const choiceListId = document.getElementById('currentChoiceListId')?.value;
  const userIsLoggedIn = document.getElementById('userIsLoggedIn')?.value === 'true';
  const isPurchaseUnlocked = document.getElementById('isPurchaseUnlocked')?.value === 'true';
  const totalChoicesCount = document.getElementById('totalChoicesCount');
  const filterTabs = document.querySelectorAll('.res-filter-tab');

  let hasUnsavedChanges = false;

  // Filter tabs handling
  if (filterTabs.length > 0) {
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => {
          t.className = 'res-filter-tab px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition';
        });
        tab.className = 'res-filter-tab active px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-xs transition';

        const filter = tab.dataset.filter;
        const rows = tableBody.querySelectorAll('.choice-row');
        rows.forEach(row => {
          if (filter === 'ALL') {
            row.classList.remove('hidden');
          } else if (filter === 'IIT' || filter === 'NIT') {
            if (row.dataset.instituteType === filter) {
              row.classList.remove('hidden');
            } else {
              row.classList.add('hidden');
            }
          } else {
            if (row.dataset.chance === filter) {
              row.classList.remove('hidden');
            } else {
              row.classList.add('hidden');
            }
          }
        });
      });
    });
  }

  // Re-number visible rows 1, 2, 3...
  function updateSequenceNumbers() {
    const rows = tableBody.querySelectorAll('.choice-row');
    rows.forEach((row, index) => {
      const numCell = row.querySelector('.choice-num');
      if (numCell) {
        numCell.textContent = String(index + 1);
        row.dataset.choiceNumber = String(index + 1);
      }
    });

    if (totalChoicesCount) {
      totalChoicesCount.textContent = `${rows.length}`;
    }

    hasUnsavedChanges = true;
    if (saveBtn) saveBtn.classList.remove('hidden');
  }

  // Row Action buttons (Move Up, Move Down, Delete)
  tableBody.addEventListener('click', (e) => {
    const upBtn = e.target.closest('.row-up-btn');
    const downBtn = e.target.closest('.row-down-btn');
    const delBtn = e.target.closest('.row-delete-btn');

    if (!upBtn && !downBtn && !delBtn) return;

    const currentRow = (upBtn || downBtn || delBtn).closest('.choice-row');
    if (!currentRow) return;

    if (upBtn) {
      const prev = currentRow.previousElementSibling;
      if (prev) {
        tableBody.insertBefore(currentRow, prev);
        updateSequenceNumbers();
      }
    } else if (downBtn) {
      const next = currentRow.nextElementSibling;
      if (next) {
        tableBody.insertBefore(next, currentRow);
        updateSequenceNumbers();
      }
    } else if (delBtn) {
      if (confirm(`Remove this choice from your list?`)) {
        currentRow.remove();
        updateSequenceNumbers();
      }
    }
  });

  // Save updated choice list to server
  async function saveListToServer() {
    if (!choiceListId) return;
    const rows = tableBody.querySelectorAll('.choice-row');
    const updatedChoices = Array.from(rows).map((row, index) => ({
      choice_number: index + 1,
      closing_rank_id: row.dataset.id,
      institute_name: row.dataset.instituteName,
      institute_type: row.dataset.instituteType,
      josaa_code: row.dataset.josaaCode,
      branch_name: row.dataset.branchName,
      quota: row.dataset.quota,
      seat_type: row.dataset.seatType,
      gender_pool: row.dataset.genderPool,
      closing_rank: parseInt(row.dataset.closingRank, 10),
      chance: row.dataset.chance,
      nirf_rank: row.dataset.nirfRank ? parseInt(row.dataset.nirfRank, 10) : null,
      avg_placement_lpa: row.dataset.avgLpa ? parseFloat(row.dataset.avgLpa) : null
    }));

    try {
      const res = await fetch(`/api/choice-list/${choiceListId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices: updatedChoices })
      });
      const data = await res.json();
      if (data.success) {
        hasUnsavedChanges = false;
        if (saveBtn) saveBtn.classList.add('hidden');
      }
    } catch (err) {
      console.error('Error auto-saving list:', err);
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>Saving...</span>`;
      await saveListToServer();
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Saved!</span>`;
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        saveBtn.classList.add('hidden');
      }, 1500);
    });
  }

  // Download Trigger Buttons
  const downloadBtns = document.querySelectorAll('.download-trigger-btn');
  downloadBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const format = btn.dataset.format;

      // 1. If purchase is already unlocked -> download directly
      if (isPurchaseUnlocked) {
        if (hasUnsavedChanges) await saveListToServer();
        window.location.href = `/api/download/${format}/${choiceListId}`;
        return;
      }

      // 2. If not logged in -> redirect to login, then come back to payment page
      if (!userIsLoggedIn) {
        window.location.href = `/login?returnTo=${encodeURIComponent('/payment/' + choiceListId)}`;
        return;
      }

      // 3. Logged in but not paid -> Open Payment Modal
      if (hasUnsavedChanges) await saveListToServer();
      if (window.openPaymentModal) {
        window.openPaymentModal(choiceListId);
      } else {
        window.location.href = `/payment/${choiceListId}`;
      }
    });
  });
});
