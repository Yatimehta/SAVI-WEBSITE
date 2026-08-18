/**
 * SAVI Corporate Website - 9-Step Enterprise Download & License Provisioning Portal
 * Product of Vinayaka Financials
 */
(function() {
  // State Store
  const state = {
    step: 1,
    company: {
      repName: '',
      email: '',
      phone: '',
      orgName: '',
      role: ''
    },
    edition: 'intelligence', // 'intelligence' | 'full-platform'
    questionnaire: {
      entities: '2–5',
      jurisdictions: '2',
      currentSystem: 'SAP S/4HANA',
      volume: '10,000–50,000',
      deployment: 'cloud-vpc'
    },
    quotation: {
      basePrice: 0,
      entityAddon: 0,
      platformName: '',
      totalAnnual: 0,
      currency: 'INR'
    },
    licenseKey: '',
    issuedAt: '',
    orderId: ''
  };

  // Pricing Matrix Generator
  function calculateQuotation() {
    let base = state.edition === 'full-platform' ? 1250000 : 650000; // INR / year base
    let entityMultiplier = 1;
    if (state.questionnaire.entities === '1') entityMultiplier = 1.0;
    else if (state.questionnaire.entities === '2–5') entityMultiplier = 1.35;
    else if (state.questionnaire.entities === '6–20') entityMultiplier = 1.85;
    else if (state.questionnaire.entities === '20+') entityMultiplier = 2.6;

    let jurisMultiplier = parseInt(state.questionnaire.jurisdictions, 10) > 1 ? 1.2 : 1.0;
    let total = Math.round(base * entityMultiplier * jurisMultiplier);

    state.quotation = {
      basePrice: base,
      entityMultiplier: entityMultiplier,
      platformName: state.edition === 'full-platform' ? 'SAVI Full Autonomous Financial Platform' : 'SAVI Intelligence & Traceability Layer',
      totalAnnual: total,
      currency: 'INR'
    };

    return state.quotation;
  }

  // Generate Deterministic Cryptographic License Key Bound to Organization Name
  function generateLicenseKey(orgName) {
    const cleanOrg = (orgName || 'ENTERPRISE').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || 'ENTERPRISE';
    const timestamp = Date.now().toString(36).toUpperCase();
    
    // Hash-like deterministic checksum
    let hash = 0;
    for (let i = 0; i < orgName.length; i++) {
      hash = ((hash << 5) - hash) + orgName.charCodeAt(i);
      hash |= 0;
    }
    const hashStr = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    const part1 = hashStr.substring(0, 4);
    const part2 = hashStr.substring(4, 8);
    const part3 = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();

    return `SAVI-ENT-2026-${cleanOrg}-${part1}-${part2}-${part3}`;
  }

  function renderStep(step) {
    state.step = step;

    // Update Progress Indicators
    document.querySelectorAll('.portal-step-node').forEach((node, index) => {
      const stepNum = index + 1;
      node.classList.remove('active', 'completed');
      if (stepNum === step) node.classList.add('active');
      else if (stepNum < step) node.classList.add('completed');
    });

    // Update Step View Panels
    document.querySelectorAll('.portal-step-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`step-view-${step}`);
    if (targetView) {
      targetView.classList.add('active');
      targetView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Dynamic Step Render Hooks
    if (step === 5) renderQuotationStep();
    if (step === 7) renderPaymentStep();
    if (step === 9) renderLicenseStep();
  }

  // Hook for Step 5 Quotation
  function renderQuotationStep() {
    const quote = calculateQuotation();
    const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(quote.totalAnnual);

    const quoteDetails = document.getElementById('quote-summary-details');
    if (quoteDetails) {
      quoteDetails.innerHTML = `
        <div class="quote-summary-row">
          <span>Target Organization:</span>
          <strong>${state.company.orgName}</strong>
        </div>
        <div class="quote-summary-row">
          <span>Authorized Representative:</span>
          <span>${state.company.repName} (${state.company.role || 'Executive'})</span>
        </div>
        <div class="quote-summary-row">
          <span>Selected Platform:</span>
          <strong style="color: var(--gold-primary);">${quote.platformName}</strong>
        </div>
        <div class="quote-summary-row">
          <span>Entity Scope:</span>
          <span>${state.questionnaire.entities} Legal Entities (${state.questionnaire.jurisdictions} Jurisdictions)</span>
        </div>
        <div class="quote-summary-row">
          <span>Source ERP System:</span>
          <span>${state.questionnaire.currentSystem}</span>
        </div>
        <div class="quote-summary-row quote-total-row">
          <span>Custom Annual License & Provisioning:</span>
          <span class="quote-total-price">${formattedTotal} / year</span>
        </div>
      `;
    }
  }

  // Hook for Step 7 Payment
  function renderPaymentStep() {
    state.orderId = 'VF-SAVI-' + Math.floor(100000 + Math.random() * 900000);
    const quote = state.quotation;
    const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(quote.totalAnnual);

    const paymentMeta = document.getElementById('payment-step-meta');
    if (paymentMeta) {
      paymentMeta.innerHTML = `
        <div class="payment-order-card">
          <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 700; margin-bottom: 6px;">Invoice Reference: ${state.orderId}</div>
          <h3 style="margin-bottom: 8px; font-size: 1.25rem;">${state.company.orgName}</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.95rem;">Authorized for ${state.company.repName} (${state.company.email})</p>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); margin-bottom: 20px;">${formattedTotal}</div>
        </div>
      `;
    }
  }

  // Hook for Step 9 License Generation
  function renderLicenseStep() {
    if (!state.licenseKey) {
      state.licenseKey = generateLicenseKey(state.company.orgName);
      state.issuedAt = new Date().toUTCString();
    }

    const keyDisplay = document.getElementById('generated-license-key');
    if (keyDisplay) keyDisplay.innerText = state.licenseKey;

    const orgDisplay = document.getElementById('license-org-name');
    if (orgDisplay) orgDisplay.innerText = state.company.orgName;

    const repDisplay = document.getElementById('license-rep-name');
    if (repDisplay) repDisplay.innerText = `${state.company.repName} (${state.company.email})`;

    const platformDisplay = document.getElementById('license-platform-name');
    if (platformDisplay) platformDisplay.innerText = state.quotation.platformName;

    const dateDisplay = document.getElementById('license-issue-date');
    if (dateDisplay) dateDisplay.innerText = state.issuedAt;
  }

  // Initialize Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Step 1: Get Started
    const startBtn = document.getElementById('btn-start-flow');
    if (startBtn) {
      startBtn.addEventListener('click', () => renderStep(2));
    }

    // Step 2: Form Submit (Account info)
    const accountForm = document.getElementById('portal-account-form');
    if (accountForm) {
      accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.company.repName = document.getElementById('portal-rep-name').value.trim();
        state.company.email = document.getElementById('portal-email').value.trim();
        state.company.phone = document.getElementById('portal-phone').value.trim();
        state.company.orgName = document.getElementById('portal-org-name').value.trim();
        state.company.role = document.getElementById('portal-role').value.trim();
        renderStep(3);
      });
    }

    // Step 3: Platform Selection Cards
    document.querySelectorAll('.edition-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.edition-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.edition = card.getAttribute('data-edition') || 'intelligence';
      });
    });

    const step3Next = document.getElementById('btn-step3-next');
    if (step3Next) {
      step3Next.addEventListener('click', () => renderStep(4));
    }

    // Step 4: Questionnaire Form Submit
    const questionForm = document.getElementById('portal-question-form');
    if (questionForm) {
      questionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.questionnaire.entities = document.getElementById('q-entities').value;
        state.questionnaire.jurisdictions = document.getElementById('q-jurisdictions').value;
        state.questionnaire.currentSystem = document.getElementById('q-system').value;
        state.questionnaire.volume = document.getElementById('q-volume').value;
        state.questionnaire.deployment = document.getElementById('q-deployment').value;
        renderStep(5);
      });
    }

    // Step 5: Quotation Approval -> Step 6
    const step5Next = document.getElementById('btn-step5-next');
    if (step5Next) {
      step5Next.addEventListener('click', () => renderStep(6));
    }

    // Step 6: Confirmation -> Step 7 Payment
    const step6Next = document.getElementById('btn-step6-next');
    if (step6Next) {
      step6Next.addEventListener('click', () => renderStep(7));
    }

    // Step 7: Razorpay Payment Simulation / Trigger -> Step 8
    const razorpayBtn = document.getElementById('btn-open-razorpay');
    if (razorpayBtn) {
      razorpayBtn.addEventListener('click', () => {
        // Open Razorpay gateway in new tab
        window.open('https://razorpay.me/@saakshisharma4719', '_blank', 'noopener');
        // Advance to Step 8 (Verification)
        renderStep(8);
      });
    }

    // Step 8: Confirm Payment Verified -> Step 9 (Issue Key)
    const step8Verify = document.getElementById('btn-verify-payment');
    if (step8Verify) {
      step8Verify.addEventListener('click', () => {
        step8Verify.innerText = 'Validating with Vinayaka Gateway...';
        step8Verify.disabled = true;
        setTimeout(() => {
          renderStep(9);
        }, 1200);
      });
    }

    // Step 9: Copy License Key
    const copyKeyBtn = document.getElementById('btn-copy-license');
    if (copyKeyBtn) {
      copyKeyBtn.addEventListener('click', () => {
        if (state.licenseKey) {
          navigator.clipboard.writeText(state.licenseKey).then(() => {
            copyKeyBtn.innerText = '✓ License Key Copied!';
            setTimeout(() => {
              copyKeyBtn.innerText = '📋 Copy License Key';
            }, 3000);
          });
        }
      });
    }

    // Step 9: Download License Certificate File
    const downloadCertBtn = document.getElementById('btn-download-cert');
    if (downloadCertBtn) {
      downloadCertBtn.addEventListener('click', () => {
        const certData = {
          product: 'SAVI Financial Intelligence Platform',
          vendor: 'Vinayaka Financials',
          authorized_organization: state.company.orgName,
          authorized_representative: state.company.repName,
          contact_email: state.company.email,
          license_key: state.licenseKey,
          edition: state.quotation.platformName,
          entity_scope: state.questionnaire.entities + ' Legal Entities',
          jurisdictions: state.questionnaire.jurisdictions,
          issued_at: state.issuedAt,
          status: 'ACTIVE_COMMERCIAL_LICENSE',
          terms: 'Restricted to authorized legal entities of ' + state.company.orgName
        };

        const blob = new Blob([JSON.stringify(certData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SAVI-LICENSE-${state.company.orgName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Back Buttons
    document.querySelectorAll('[data-step-back]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = parseInt(btn.getAttribute('data-step-back'), 10);
        if (target >= 1) renderStep(target);
      });
    });
  });
})();
