/* ==========================================================================
   SAVI Corporate Website - Spam Protection (CAPTCHA & Honeypot)
   ========================================================================== */

function initCaptcha(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Generate math puzzle
  const num1 = 4;
  const num2 = 3;
  const expectedSum = num1 + num2; // 7

  container.innerHTML = `
    <div class="captcha-container">
      <span class="captcha-label">Spam Protection: What is ${num1} + ${num2}? <span class="required">*</span></span>
      <input type="number" id="captchaAnswer" class="captcha-input" required placeholder="?" aria-label="Spam protection math challenge">
      <input type="hidden" id="captchaToken" value="${expectedSum}">
      <input type="text" id="hpField" name="website_url_hp" style="display:none !important;" tabindex="-1" autocomplete="off">
    </div>
  `;
}

function verifyCaptcha() {
  const captchaAnswer = document.getElementById('captchaAnswer')?.value;
  const hpField = document.getElementById('hpField')?.value;

  // If honeypot is filled, it's a bot
  if (hpField && hpField.length > 0) {
    return { valid: false, error: 'Bot detection triggered.' };
  }

  if (!captchaAnswer || parseInt(captchaAnswer) !== 7) {
    return { valid: false, error: 'Incorrect spam protection answer. Please solve 4 + 3.' };
  }

  return { valid: true };
}
