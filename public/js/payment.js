// public/js/payment.js
// Client-side Controller for Pankaj Kumar's Navi, PhonePe, Paytm QR & Admin Verification

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('paymentModal');
  const closeBtn = document.getElementById('closePaymentModalBtn');
  const closeAfterUnlockBtn = document.getElementById('modalCloseAfterUnlockBtn');
  
  // States
  const paymentFormState = document.getElementById('paymentFormState');
  const paymentPendingState = document.getElementById('paymentPendingState');
  const paymentApprovedState = document.getElementById('paymentApprovedState');
  const pendingUtrDisplay = document.getElementById('pendingUtrDisplay');

  // Form elements
  const paymentChoiceListId = document.getElementById('paymentChoiceListId');
  const paymentErrorMsg = document.getElementById('paymentErrorMsg');
  const utrInput = document.getElementById('modalUpiUtrInput');
  const submitUpiBtn = document.getElementById('modalSubmitUpiBtn');
  const submitUpiText = document.getElementById('modalUpiSubmitText');
  const checkStatusBtn = document.getElementById('btnCheckApprovalStatus');
  const reenterUtrBtn = document.getElementById('btnReenterUtr');

  // Dynamic Elements
  const activeQrImage = document.getElementById('activeQrImage');
  const activeUpiIdText = document.getElementById('activeUpiIdText');
  const directPayLink = document.getElementById('directPayLink');
  const directPayText = document.getElementById('directPayText');
  const activeSelectedApp = document.getElementById('activeSelectedApp');
  const copyBtn = document.getElementById('copyUpiBtn');
  const copyBtnText = document.getElementById('copyUpiBtnText');
  const appTabs = document.querySelectorAll('.app-tab');

  const APP_CONFIG = {
    navi: {
      id: 'navi',
      name: 'Navi UPI',
      upiId: '8000859195@naviaxis',
      qrImage: '/images/qr-navi.png',
      intent: 'upi://pay?pa=8000859195@naviaxis&pn=Pankaj%20Kumar&am=49&cu=INR&tn=PreJOSAA',
      btnText: 'Pay ₹49 on Navi / Installed UPI App'
    },
    phonepe: {
      id: 'phonepe',
      name: 'PhonePe',
      upiId: '8000859195-oc44@ibl',
      qrImage: '/images/qr-phonepe.png',
      intent: 'phonepe://pay?pa=8000859195-oc44@ibl&pn=Pankaj%20Kumar&am=49&cu=INR&tn=PreJOSAA',
      btnText: 'Pay ₹49 on PhonePe App'
    },
    paytm: {
      id: 'paytm',
      name: 'Paytm',
      upiId: '8000859195@ptsbi',
      qrImage: '/images/qr-paytm.png',
      intent: 'paytmmp://pay?pa=8000859195@ptsbi&pn=Pankaj%20Kumar&am=49&cu=INR&tn=PreJOSAA',
      btnText: 'Pay ₹49 on Paytm App'
    }
  };

  if (!modal) return;

  function showError(msg) {
    if (paymentErrorMsg) {
      paymentErrorMsg.textContent = msg;
      paymentErrorMsg.classList.remove('hidden');
    }
  }

  function hideError() {
    if (paymentErrorMsg) {
      paymentErrorMsg.classList.add('hidden');
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeAfterUnlockBtn) closeAfterUnlockBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Switch App Tab
  function switchApp(appKey) {
    const config = APP_CONFIG[appKey] || APP_CONFIG.navi;
    if (activeSelectedApp) activeSelectedApp.value = appKey;

    if (activeQrImage) activeQrImage.src = config.qrImage;
    if (activeUpiIdText) activeUpiIdText.textContent = config.upiId;
    if (directPayLink) directPayLink.href = config.intent;
    if (directPayText) directPayText.textContent = config.btnText;

    appTabs.forEach(tab => {
      const isSelected = tab.dataset.app === appKey;
      tab.classList.toggle('active', isSelected);
      tab.classList.toggle('border-2', isSelected);
      tab.classList.toggle('border-emerald-500', isSelected && appKey === 'navi');
      tab.classList.toggle('border-purple-500', isSelected && appKey === 'phonepe');
      tab.classList.toggle('border-blue-600', isSelected && appKey === 'paytm');
      tab.classList.toggle('bg-emerald-50/80', isSelected && appKey === 'navi');
      tab.classList.toggle('bg-purple-50/80', isSelected && appKey === 'phonepe');
      tab.classList.toggle('bg-sky-50/80', isSelected && appKey === 'paytm');
    });

    if (window.lucide) window.lucide.createIcons();
  }

  appTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchApp(tab.dataset.app);
    });
  });

  // Copy active UPI ID
  if (copyBtn && activeUpiIdText) {
    copyBtn.addEventListener('click', async () => {
      try {
        const textToCopy = activeUpiIdText.textContent.trim();
        await navigator.clipboard.writeText(textToCopy);
        if (copyBtnText) copyBtnText.textContent = 'Copied!';
        copyBtn.classList.add('bg-emerald-600');
        setTimeout(() => {
          if (copyBtnText) copyBtnText.textContent = 'Copy';
          copyBtn.classList.remove('bg-emerald-600');
        }, 2000);
      } catch (err) {
        console.warn('Copy failed:', err);
      }
    });
  }

  // Open Payment Modal
  window.openPaymentModal = async (choiceListId) => {
    paymentChoiceListId.value = choiceListId;
    modal.classList.remove('hidden');
    hideError();
    switchApp('navi');

    await checkPaymentStatus(choiceListId);
  };

  function showApprovedState(choiceListId) {
    if (paymentFormState) paymentFormState.classList.add('hidden');
    if (paymentPendingState) paymentPendingState.classList.add('hidden');
    if (paymentApprovedState) paymentApprovedState.classList.remove('hidden');

    const dlPdf = document.getElementById('modalDownloadPdf');
    const dlXlsx = document.getElementById('modalDownloadXlsx');
    const dlDocx = document.getElementById('modalDownloadDocx');
    const dlCsv = document.getElementById('modalDownloadCsv');

    if (dlPdf) dlPdf.href = `/api/download/pdf/${choiceListId}`;
    if (dlXlsx) dlXlsx.href = `/api/download/xlsx/${choiceListId}`;
    if (dlDocx) dlDocx.href = `/api/download/docx/${choiceListId}`;
    if (dlCsv) dlCsv.href = `/api/download/csv/${choiceListId}`;

    const unlockedInput = document.getElementById('isPurchaseUnlocked');
    if (unlockedInput) unlockedInput.value = 'true';

    if (window.lucide) window.lucide.createIcons();
  }

  function showPendingState(utr) {
    if (paymentFormState) paymentFormState.classList.add('hidden');
    if (paymentApprovedState) paymentApprovedState.classList.add('hidden');
    if (paymentPendingState) paymentPendingState.classList.remove('hidden');

    if (pendingUtrDisplay) pendingUtrDisplay.textContent = utr || 'Under Admin Verification';
    if (window.lucide) window.lucide.createIcons();
  }

  function showFormState() {
    if (paymentPendingState) paymentPendingState.classList.add('hidden');
    if (paymentApprovedState) paymentApprovedState.classList.add('hidden');
    if (paymentFormState) paymentFormState.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async function checkPaymentStatus(choiceListId) {
    try {
      const res = await fetch(`/api/payment-status/${choiceListId}`);
      const data = await res.json();

      if (data.isUnlocked || data.status === 'approved') {
        showApprovedState(choiceListId);
        return 'approved';
      } else if (data.status === 'pending') {
        showPendingState(data.upiReferenceId || '');
        return 'pending';
      } else {
        showFormState();
        return 'not_paid';
      }
    } catch (err) {
      console.error('Error fetching payment status:', err);
      showFormState();
      return 'error';
    }
  }

  // Submit UTR for Admin Review
  if (submitUpiBtn) {
    submitUpiBtn.addEventListener('click', async () => {
      const choiceListId = paymentChoiceListId.value;
      const utr = utrInput ? utrInput.value.trim() : '';
      const selectedApp = activeSelectedApp ? activeSelectedApp.value : 'navi';

      if (!choiceListId) {
        showError('Choice list ID is missing. Please close and re-open the modal.');
        return;
      }

      if (!utr || utr.length < 6) {
        showError('Please enter a valid 12-digit UPI Reference Number / UTR from your receipt.');
        if (utrInput) utrInput.focus();
        return;
      }

      hideError();
      submitUpiBtn.disabled = true;
      if (submitUpiText) submitUpiText.textContent = 'Submitting to Admin...';

      try {
        const verifyRes = await fetch('/api/payment/verify-upi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            choiceListId: choiceListId,
            upiReferenceId: utr,
            upiApp: selectedApp
          })
        });

        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          if (verifyData.isUnlocked) {
            showApprovedState(choiceListId);
          } else {
            showPendingState(utr);
          }
        } else {
          throw new Error(verifyData.message || 'Payment submission failed.');
        }
      } catch (err) {
        console.error('UPI Submission error:', err);
        showError(err.message || 'Could not submit payment. Please verify the UTR and try again.');
        submitUpiBtn.disabled = false;
        if (submitUpiText) submitUpiText.textContent = 'Submit UTR for Admin Verification';
      }
    });
  }

  // Check Approval Status manually
  if (checkStatusBtn) {
    checkStatusBtn.addEventListener('click', async () => {
      const choiceListId = paymentChoiceListId.value;
      if (!choiceListId) return;

      checkStatusBtn.disabled = true;
      const originalText = checkStatusBtn.innerHTML;
      checkStatusBtn.innerHTML = `<span>Checking...</span>`;

      const status = await checkPaymentStatus(choiceListId);
      if (status !== 'approved') {
        alert('Payment is still pending admin review. The admin will verify your payment shortly.');
      }

      checkStatusBtn.disabled = false;
      checkStatusBtn.innerHTML = originalText;
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // Re-enter UTR
  if (reenterUtrBtn) {
    reenterUtrBtn.addEventListener('click', () => {
      showFormState();
      if (submitUpiBtn) {
        submitUpiBtn.disabled = false;
        if (submitUpiText) submitUpiText.textContent = 'Submit UTR for Admin Verification';
      }
      if (utrInput) utrInput.focus();
    });
  }
});
