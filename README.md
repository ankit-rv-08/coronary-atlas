# Coronary Atlas

Interactive 3D coronary artery disease risk visualization. Coronary Atlas predicts CAD and vessel-specific risk for LAD, LCX, and RCA from clinical data, maps risk onto an anatomical heart model, and presents model contributions for explainability.

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm

## Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://127.0.0.1:8000`. Check it with:

```bash
curl http://127.0.0.1:8000/health
```

## Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Use a scenario preset or enter patient values, then select **Run prediction**. Selecting a CAD or vessel card updates the contribution panel.

To use a deployed backend locally, set `VITE_API_URL` before starting Vite:

```bash
VITE_API_URL=https://your-api.onrender.com npm run dev
```

## Prediction API

`POST /predict` accepts clinical features under `features` and returns probability, status, severity, and contribution data for each available target:

```json
{
  "features": {
    "Age": 52,
    "Sex": 1,
    "BP": 132,
    "PR": 76
  }
}
```

## Deployment

- `render.yaml` defines the FastAPI service for Render.
- `frontend/vercel.json` configures the Vite build for Vercel.
- Set `VITE_API_URL` to the deployed Render API URL in the Vercel project environment variables.

## Dataset

The model uses the repository's trained model artifacts under `backend/app/ml/saved_models/`. Clinical feature names follow the source training dataset and are intended for educational and decision-support visualization, not diagnosis.
