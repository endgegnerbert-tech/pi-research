import sys
import json
import logging
import joblib
import numpy as np
import traceback
import os

# Add the directory containing features.py to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from features import load_embedding_model, extract_domain_features, extract_followup_features

logging.basicConfig(level=logging.ERROR)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing model path"}))
        sys.exit(1)
        
    model_dir = sys.argv[1]
    # Expecting model_dir to be the root of the models, e.g. .cache/models/pi-research-router
    # We will try to load domain/model.joblib and followup/model.joblib
    
    try:
        emb_model = load_embedding_model()
        domain_clf = None
        followup_clf = None
        
        domain_path = os.path.join(model_dir, "domain", "model.joblib")
        if os.path.exists(domain_path):
            domain_clf = joblib.load(domain_path)
            
        followup_path = os.path.join(model_dir, "followup", "model.joblib")
        if os.path.exists(followup_path):
            followup_clf = joblib.load(followup_path)
            
    except Exception as e:
        print(json.dumps({"error": f"Failed to load models: {str(e)}"}))
        sys.exit(1)
        
    print("READY", flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            req = json.loads(line)
            task = req.get("task", "domain")
            query = req.get("query", "")
            mode = req.get("mode", "fast")
            
            if task == "domain":
                if not domain_clf:
                    print(json.dumps({"error": "Domain model not loaded"}), flush=True)
                    continue
                    
                feats = extract_domain_features([query], [mode], emb_model=emb_model, show_progress_bar=False)
                proba = domain_clf.predict_proba(feats)[0]
                max_idx = np.argmax(proba)
                pred = domain_clf.classes_[max_idx]
                confidence = float(proba[max_idx])
                
                print(json.dumps({
                    "domain": str(pred),
                    "confidence": confidence
                }), flush=True)
                
            elif task == "followup":
                if not followup_clf:
                    print(json.dumps({"error": "Followup model not loaded"}), flush=True)
                    continue
                
                conflict = req.get("conflict", "none")
                sources = req.get("sources", {})
                
                feats = extract_followup_features([query], [mode], [conflict], [sources], emb_model=emb_model, show_progress_bar=False)
                proba = followup_clf.predict_proba(feats)[0]
                max_idx = np.argmax(proba)
                pred = followup_clf.classes_[max_idx]
                confidence = float(proba[max_idx])
                
                print(json.dumps({
                    "action": str(pred),
                    "confidence": confidence
                }), flush=True)
                
            else:
                print(json.dumps({"error": f"Unknown task: {task}"}), flush=True)
            
        except Exception as e:
            print(json.dumps({"error": str(e), "trace": traceback.format_exc()}), flush=True)

if __name__ == "__main__":
    main()
