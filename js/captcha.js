/* ==========================================================================
   SAVI Corporate Website - Dynamic Spam Protection (CAPTCHA & Honeypot)
   ========================================================================== */

function initCaptcha(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Generate dynamic, random math challenge (addition, subtraction, or simple multiplication)
  const ops = ['+', '+', '-', '+'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let num1, num2, expectedAnswer;

  if (op === '-') {
    num1 = Math.floor(Math.random() * 8) + 6; // 6 to 13
    num2 = Math.floor(Math.random() * 5) + 1; // 1 to 5
    expectedAnswer = num1 - num2;
  } else {
    num1 = Math.floor(Math.random() * 9) + 2; // 2 to 10
    num2 = Math.floor(Math.random() * 8) + 1; // 1 to 8
    expectedAnswer = num1 + num2;
  }

  container.innerHTML = `
    <div class="captcha-container" style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-card); border-radius: 8px;">
      <span class="captcha-label" style="font-size: 0.9rem; font-weight: 600; color: var(--text-heading);">
        Spam Protection: What is <strong>${num1} ${op} ${num2}</strong>? <span class="required" style="color: #E5C378;">*</span>
      </span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="number" id="captchaAnswer" class="captcha-input" required placeholder="?" aria-label="Spam protection math challenge" style="width: 70px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-heading); font-size: 1rem; text-align: center;">
        <button type="button" onclick="initCaptcha('${containerId}')" title="Generate new question" style="background: none; border: none; cursor: pointer; color: var(--gold-primary); font-size: 1.1rem; padding: 4px;" aria-label="Refresh challenge">&#8635;</button>
      </div>
      <input type="hidden" id="captchaToken" value="${expectedAnswer}">
      <input type="hidden" id="captchaQuestion" value="${num1} ${op} ${num2}">
      <input type="text" id="hpField" name="website_url_hp" style="display:none !important;" tabindex="-1" autocomplete="off">
    </div>
  `;
}

function verifyCaptcha() {
  const captchaAnswer = document.getElementById('captchaAnswer')?.value;
  const captchaToken = document.getElementById('captchaToken')?.value;
  const captchaQuestion = document.getElementById('captchaQuestion')?.value || 'the challenge';
  const hpField = document.getElementById('hpField')?.value;

  // If honeypot is filled, it's a bot
  if (hpField && hpField.length > 0) {
    return { valid: false, error: 'Bot detection triggered.' };
  }

  if (!captchaAnswer || parseInt(captchaAnswer, 10) !== parseInt(captchaToken, 10)) {
    return { valid: false, error: `Incorrect spam protection answer. Please solve: ${captchaQuestion}` };
  }

  return { valid: true };
}
