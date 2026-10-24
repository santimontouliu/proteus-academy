'use strict';

// Only a positive service acknowledgment counts as accepted; inbox delivery is not asserted.
async function deliverInquiry(endpoint, payload, options = {}) {
  const request = options.fetchImpl || fetch;
  const response = await request(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    body: JSON.stringify(payload),
    signal: options.signal,
    credentials: 'omit',
    referrerPolicy: 'strict-origin-when-cross-origin'
  });
  if (!response.ok) throw new Error('service-rejected');
  const result = await response.json();
  if (!result || (result.success !== true && result.success !== 'true')) {
    throw new Error('service-rejected');
  }
  const needsActivation = typeof result.message === 'string' &&
    /activat|confirm.{0,25}(?:email|address)|check.{0,25}(?:email|inbox)/i.test(result.message);
  return needsActivation ? 'activation-required' : 'accepted';
}

const inquiryForm = document.querySelector('#inquiry-form');
if (inquiryForm) {
  let sending = false;
  const status = document.querySelector('#form-status');
  const submitButton = inquiryForm.querySelector('button[type="submit"]');
  const originalLabel = submitButton.innerHTML;
  const showStatus = (message, state) => {
    status.textContent = message;
    status.dataset.state = state;
    status.focus({preventScroll: true});
  };
  inquiryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !inquiryForm.reportValidity()) return;
    const data = new FormData(inquiryForm);
    // A filled honeypot is not reported as a delivered message.
    if (String(data.get('_honey') || '').trim()) {
      showStatus('This inquiry could not be submitted. Please email contact@useproteus.io directly.', 'error');
      return;
    }
    const payload = Object.fromEntries(data.entries());
    payload.name = String(payload.name || '').trim();
    payload.email = String(payload.email || '').trim();
    payload.goals = String(payload.goals || '').trim();
    if (!payload.name || !payload.email || !payload.goals) {
      showStatus('Please enter your name, email, and learning goals before sending.', 'error');
      return;
    }
    payload._url = location.origin + location.pathname;
    const endpoint = inquiryForm.action.replace('https://formsubmit.co/', 'https://formsubmit.co/ajax/');
    sending = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';
    inquiryForm.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your inquiry securely…';
    status.dataset.state = 'pending';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const outcome = await deliverInquiry(endpoint, payload, {signal: controller.signal});
      if (outcome === 'activation-required') {
        showStatus('The email service requires academy activation before forwarding inquiries. Your details are still here. Please email contact@useproteus.io directly for now.', 'error');
      } else {
        showStatus('Your inquiry has been accepted for forwarding to contact@useproteus.io. This does not confirm a consultation or enrollment. If you do not hear back, please email us directly.', 'success');
        inquiryForm.reset();
      }
    } catch {
      // A timeout can happen after the service accepted a request. Never retry automatically.
      showStatus('We could not confirm that your inquiry was accepted. Your details are still here. Please email contact@useproteus.io directly; if you try again, a duplicate may be sent.', 'error');
    } finally {
      clearTimeout(timeout);
      sending = false;
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
      inquiryForm.removeAttribute('aria-busy');
    }
  });
}
