'use strict';

// Prepare an email locally. Opening a mailto link does not send a message.
function buildInquiryEmail(fields) {
  const value = key => String(fields[key] || '').trim();
  const body = [
    'Hello Proteus Academy,',
    '',
    'I would like to discuss academic support.',
    '',
    `Name: ${value('name')}`,
    `Contact email: ${value('email')}`,
    `I am a: ${value('role')}`,
    `Pathway: ${value('pathway')}`,
    `Interested in: ${value('interest')}`,
    '',
    'My goals:',
    value('goals'),
    '',
    'Thank you.'
  ].join('\r\n');
  return 'mailto:contact@useproteus.io?subject=' +
    encodeURIComponent('Proteus Academy — Academic inquiry') +
    '&body=' + encodeURIComponent(body);
}

const inquiryForm = document.querySelector('#inquiry-form');
if (inquiryForm) {
  inquiryForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!inquiryForm.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(inquiryForm).entries());
    const status = document.querySelector('#form-status');
    if (!String(fields.name || '').trim() || !String(fields.goals || '').trim()) {
      status.textContent = 'Please enter your name and learning goals before preparing the email.';
      status.dataset.state = 'error';
      status.focus({preventScroll:true});
      return;
    }
    status.textContent = 'Your email app should open with a prepared draft. Review it and click Send there. Nothing has been sent by this website. If no app opens, use the email link below or copy these details into your webmail.';
    status.dataset.state = 'ready';
    // Keep the entries visible in case no mail application is configured.
    window.location.href = buildInquiryEmail(fields);
  });
}
