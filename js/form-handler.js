/* ==========================================================================
   SAVI Corporate Website - Form Handler & Routing
   Target Email: saakshi@vinayakafinancials.com
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize spam protection on any page with a form
  if (document.getElementById('captcha-wrapper')) {
    initCaptcha('captcha-wrapper');
  }

  const demoForm = document.getElementById('demo-form');
  const quoteForm = document.getElementById('quote-form');

  if (demoForm) {
    demoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'demo'));
  }

  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => handleFormSubmit(e, 'quote'));
  }
});

async function handleFormSubmit(event, formType) {
  event.preventDefault();

  const form = event.target;
  const statusBox = document.getElementById('form-status-message');
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnContent = submitBtn ? submitBtn.innerHTML : 'Submit';

  // Verify spam protection (CAPTCHA & Honeypot)
  const captchaResult = verifyCaptcha();
  if (!captchaResult.valid) {
    showFormError(statusBox, captchaResult.error);
    showToast(captchaResult.error, 'error');
    return;
  }

  // Work email check
  const emailInput = form.querySelector('input[type="email"]');
  if (emailInput) {
    const emailVal = emailInput.value.trim().toLowerCase();
    if (!emailVal || !emailVal.includes('@')) {
      showFormError(statusBox, 'Please enter a valid work email address.');
      showToast('Please enter a valid work email address.', 'error');
      return;
    }
  }

  // Gather form data
  const formData = new FormData(form);
  const data = {
    formType: formType,
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company'),
    role: formData.get('role'),
    entities: formData.get('entities'),
    jurisdictions: formData.get('jurisdictions'),
    platform: formData.get('platform'),
    currentSystem: formData.get('currentSystem'),
    message: formData.get('message'),
    captchaAnswer: document.getElementById('captchaAnswer')?.value,
    captchaToken: document.getElementById('captchaToken')?.value
  };

  // Provide immediate visual feedback on button
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.85';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.innerHTML = `
      <span style="display: inline-block; animation: spin 1s infinite linear; margin-right: 8px;">⏳</span>
      Sending Request...
    `;
  }
  showToast('Sending your request securely...', 'info');

  try {
    const response = await fetch('/api/submit-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      showToast('✓ Request Sent Successfully! Confirmation dispatched to email.', 'success');
      form.style.display = 'none';

      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.className = 'card text-center';
        statusBox.style.padding = '48px 32px';
        statusBox.style.border = '2px solid var(--gold-primary)';
        statusBox.innerHTML = `
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(229,195,120,0.15); border: 2px solid var(--gold-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 26px; color: var(--gold-primary);">✓</div>
          <h3 style="color: var(--text-heading); font-size: 1.6rem; margin-bottom: 12px; font-weight: 700;">Walkthrough Request Received</h3>
          <p style="font-size: 1.1rem; color: var(--text-body); max-width: 540px; margin: 0 auto 24px; line-height: 1.6;">${result.message}</p>
          <div style="padding: 14px 20px; background: rgba(14, 165, 233, 0.08); border: 1px solid var(--border-card); border-radius: 8px; font-size: 0.95rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 24px;">
            📧 Instant notification sent to <strong>saakshi@vinayakafinancials.com</strong> and confirmation receipt dispatched to <strong>${data.email}</strong>.
          </div>
          <a href="/" class="btn btn-gold" style="display: inline-flex;">Return to Homepage</a>
        `;
        window.scrollTo({ top: statusBox.offsetTop - 100, behavior: 'smooth' });
      }
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.innerHTML = originalBtnContent;
      }
      showFormError(statusBox, result.error || 'An error occurred. Please try again.');
      showToast(result.error || 'Submission failed. Please check form.', 'error');
    }
  } catch (err) {
    console.error('Form submission error:', err);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.innerHTML = originalBtnContent;
    }
    const errMsg = 'Unable to connect to the server. Please try again or email saakshi@vinayakafinancials.com directly.';
    showFormError(statusBox, errMsg);
    showToast(errMsg, 'error');
  }
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('savi-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'savi-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 90vw;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#0F482F' : type === 'error' ? '#681B1B' : '#0B1F3A';
  const border = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#E5C378';

  toast.style.cssText = `
    background: ${bg};
    color: #FFFFFF;
    border: 1.5px solid ${border};
    border-radius: 8px;
    padding: 12px 18px;
    font-size: 0.9rem;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    opacity: 0;
    transform: translateY(12px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
  `;
  toast.innerText = message;

  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showFormError(element, message) {
  if (!element) return;
  element.style.display = 'block';
  element.className = 'form-group';
  element.innerHTML = `<div style="color: #D9534F; background: #FDF7F7; border: 1px solid #D9534F; padding: 12px 16px; border-radius: 4px; font-size: 0.9375rem;">${message}</div>`;
}
