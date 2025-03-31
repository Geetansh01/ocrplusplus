import torch
from transformers import BertTokenizerFast, BertForTokenClassification
from flask import Flask, request, jsonify
from UtilityFunctions.utilityFunctions2 import preprocess_data, predict, idx2tag
import PyPDF2
import io

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

MAX_LEN = 500
NUM_LABELS = 12
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = 'bert-base-uncased'
STATE_DICT = torch.load("model-state.bin", map_location=DEVICE)
TOKENIZER = BertTokenizerFast("./vocab/vocab.txt", lowercase=True)

model = BertForTokenClassification.from_pretrained(
    'bert-base-uncased', state_dict=STATE_DICT['model_state_dict'], num_labels=NUM_LABELS)
model.to(DEVICE)


@app.route('/extract', methods=['POST'])
def extract():
    if 'file' in request.files:
        file = request.files['file']
        if file.filename.endswith('.pdf'):
            resume_text = extract_text_from_pdf(file)
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
    else:
        resume_text = request.json.get('text', '')

    if not resume_text:
        return jsonify({'error': 'No text provided'}), 400

    resume_text = preprocess_data(resume_text)
    raw_entities = predict(model, TOKENIZER, idx2tag, DEVICE, resume_text, MAX_LEN)
  
    structured_data = {
        'name': next((e['text'] for e in raw_entities if e['entity'] == 'Name'), ''),
        'degree': [e['text'] for e in raw_entities if e['entity'] == 'Degree'],
        'skills': [e['text'] for e in raw_entities if e['entity'] == 'Skills'],
        'college_name': [e['text'] for e in raw_entities if e['entity'] == 'College Name'],
        'email': next((e['text'] for e in raw_entities if e['entity'] == 'Email Address'), ''),
        'designation': [e['text'] for e in raw_entities if e['entity'] == 'Designation'],
        'companies': [e['text'] for e in raw_entities if e['entity'] == 'Companies worked at'],
        'graduation_year': next((e['text'] for e in raw_entities if e['entity'] == 'Graduation Year'), ''),
        'experience': next((e['text'] for e in raw_entities if e['entity'] == 'Years of Experience'), ''),
        'location': next((e['text'] for e in raw_entities if e['entity'] == 'Location'), '')
    }
    
    return jsonify({
        'raw': raw_entities,
        'structured': structured_data
    })

def extract_text_from_pdf(file):
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

if __name__ == '__main__':
    app.run(debug=True)