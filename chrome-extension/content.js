chrome.storage.local.get('entities', (data) => {
  const entities = data.entities;
  if (!entities) {
	console.log('No entities found in storage.');
	return;
  }
  console.log('Extracted entities:', entities);	

  const fields = document.querySelectorAll('input, textarea');
  fields.forEach((field) => {
    const fieldName = field.name || field.id || field.placeholder;
    if (!fieldName) return;

    for (const entity of entities) {
      if (fieldName.toLowerCase().includes(entity.entity.toLowerCase())) {
        field.value = entity.text;
	console.log(`Autofilled ${entity.entity}: ${entity.text}`);
        break;
      }
    }
  });
});