console.log('Content script loaded!');

function autofillForm(entities) {
  if (!entities || !entities.length) {
    console.log('No entities to autofill');
    return;
  }

  // Field matching configuration
  const fieldConfig = [
    {
      field: 'name',
      selectors: [
        'input[name*="name" i]', 'input[id*="name" i]', 
        'input[placeholder*="name" i]', '#fullname',
        '#applicant_name', '*[aria-label*="name" i]'
      ]
    },
    {
      field: 'email',
      selectors: [
        'input[type="email"]', 'input[name*="email" i]',
        'input[id*="email" i]', '*[aria-label*="email" i]'
      ]
    },
    {
      field: 'phone',
      selectors: [
        'input[type="tel"]', 'input[name*="phone" i]',
        'input[id*="phone" i]', 'input[name*="mobile" i]'
      ]
    },
    {
      field: 'degree',
      selectors: [
        'input[name*="degree" i]', 'select[name*="education" i]',
        'textarea[name*="qualification" i]', '#education'
      ],
      isArray: true
    },
    {
      field: 'skills',
      selectors: [
        'textarea[name*="skills" i]', 'input[name*="skills" i]',
        '#skills', '#expertise', '*[aria-label*="skills" i]'
      ],
      isArray: true
    },
    {
      field: 'college_name',
      selectors: [
        'input[name*="college" i]', 'input[name*="university" i]',
        '#school', '#institution'
      ],
      isArray: true
    },
    {
      field: 'designation',
      selectors: [
        'input[name*="title" i]', 'input[name*="position" i]',
        '#jobtitle', '*[aria-label*="current role" i]'
      ],
      isArray: true
    },
    {
      field: 'companies',
      selectors: [
        'input[name*="company" i]', 'input[name*="employer" i]',
        '#work_history', '*[aria-label*="experience" i]'
      ],
      isArray: true
    },
    {
      field: 'graduation_year',
      selectors: [
        'input[name*="graduation" i]', 'select[name*="year" i]',
        '#grad_year', '*[aria-label*="year graduated" i]'
      ]
    },
    {
      field: 'experience',
      selectors: [
        'input[name*="experience" i]', 'select[name*="exp" i]',
        '#years_exp', '*[aria-label*="years of experience" i]'
      ]
    },
    {
      field: 'location',
      selectors: [
        'input[name*="location" i]', 'input[name*="city" i]',
        '#address', '*[aria-label*="location" i]'
      ]
    }
  ];

  // raw entities to structured data
  const resumeData = {};
  entities.forEach(entity => {
    const key = entity.entity.toLowerCase().replace(/\s+/g, '_');
    if (!resumeData[key]) {
      resumeData[key] = [];
    }
    resumeData[key].push(entity.text);
  });

  // Autofill the form fields
  fieldConfig.forEach(config => {
    const fieldKey = config.field.toLowerCase().replace(/\s+/g, '_');
    if (!resumeData[fieldKey] || !resumeData[fieldKey].length) return;

    const value = config.isArray 
      ? resumeData[fieldKey].join(', ')
      : resumeData[fieldKey][0];

    for (const selector of config.selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => {
          if (el.tagName === 'SELECT') {
            const options = Array.from(el.options);
            const matchingOption = options.find(opt => 
              opt.text.toLowerCase().includes(value.toLowerCase())
            );
            if (matchingOption) {
              el.value = matchingOption.value;
            }
          } else {
            el.value = value;
          }
          console.log(`Autofilled ${config.field} (${selector}): ${value}`);
        });
        break;
      }
    }
  });

  highlightMissingFields(['name', 'email', 'phone']);
}

function highlightMissingFields(fields) {
  fields.forEach(field => {
    const selectors = [
      `input[name*="${field}" i]`,
      `input[id*="${field}" i]`,
      `input[placeholder*="${field}" i]`
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(input => {
        if (!input.value) {
          input.style.border = '2px solid red';
          input.setAttribute('data-missing', 'true');
        }
      });
    });
  });
}

chrome.storage.local.get('entities', (data) => {
  console.log('Storage entities:', data.entities);
  if (data.entities && data.entities.raw) {
    autofillForm(data.entities.raw);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  if (request.action === 'fillForm') {
    chrome.storage.local.get('entities', (data) => {
      if (data.entities && data.entities.raw) {
        autofillForm(data.entities.raw);
      }
    });
  }
  return true; 
});