import torch
from transformers import BertTokenizerFast, BertForTokenClassification
from flask import Flask, request, render_template_string, jsonify
from UtilityFunctions.utilityFunctions2 import preprocess_data, predict, idx2tag

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
    data = request.json
    resume_text = data.get('text', '')
    if not resume_text:
        return jsonify({'error': 'No text provided'}), 400

    # Preprocess and predict entities
    resume_text = preprocess_data(resume_text)
    entities = predict(model, TOKENIZER, idx2tag, DEVICE, resume_text, MAX_LEN)
    return jsonify(entities)

if __name__ == '__main__':
    app.run(debug=True)