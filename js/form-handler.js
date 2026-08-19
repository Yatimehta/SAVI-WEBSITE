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

  // Verify spam protection (CAPTCHA & Honeypot)
  const captchaResult = verifyCaptcha();
  if (!captchaResult.valid) {
    showFormError(statusBox, captchaResult.error);
    return;
  }

  // Work email check
  const emailInput = form.querySelector('input[type="email"]');
  if (emailInput) {
    const emailVal = emailInput.value.trim().toLowerCase();
    // Validate email format
    if (!emailVal || !emailVal.includes('@')) {
      showFormError(statusBox, 'Please enter a valid work email address.');
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
      // Display high-visibility confirmation card
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
          <div style="padding: 14px 20px; background: rgba(14, 165, 233, 0.08); border: 1px solid var(--border-card); border-radius: 8px; font-size: 0.9rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 24px;">
            📧 Confirmation notification dispatched to <strong>${data.email}</strong>.<br>Our team will reach out directly to finalize the schedule.
          </div>
          <a href="/" class="btn btn-gold" style="display: inline-flex;">Return to Homepage</a>
        `;
        window.scrollTo({ top: statusBox.offsetTop - 100, behavior: 'smooth' });
      }
    } else {
      showFormError(statusBox, result.error || 'An error occurred. Please try again.');
    }
  } catch (err) {
    console.error('Form submission error:', err);
    showFormError(statusBox, 'Unable to connect to the server. Please try again or email saakshi@vinayakafinancials.com directly.');
  }
}

function showFormError(element, message) {
  if (!element) return;
  element.style.display = 'block';
  element.className = 'form-group';
  element.innerHTML = `<div style="color: #D9534F; background: #FDF7F7; border: 1px solid #D9534F; padding: 12px 16px; border-radius: 4px; font-size: 0.9375rem;">${message}</div>`;
}
