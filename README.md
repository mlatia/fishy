# 🐟 Fishy: Intelligent Fish Location Prediction & Heatmap Visualization

Fishy is an interactive web application that predicts fish distribution and visualizes it on a dynamic heatmap. It combines the power of **machine learning** with intuitive **map-based visuals** to help researchers, fishers, and enthusiasts discover likely fish hotspots.

---

## 🚀 What It Does

- 🎯 **Predicts fish locations** using trained machine learning models.
- 🧠 Utilizes oceanographic data such as temperature, salinity, and depth to generate predictions.
- 🗺️ Visualizes predictions as a heatmap over an interactive Leaflet map.

---

## ⚙️ Tech Stack

- **Frontend**: React + TypeScript + Leaflet + Tailwind CSS  
- **Backend**: Python (with ML model for fish prediction)  
- **Machine Learning**: scikit-learn / custom predictive modeling  

---

## 🛠️ How to Run the Project

### 🐍 1. Start the Backend (Python)

Ensure Python is installed and any dependencies are set up. Then run:

```bash
python backend\app.py"
````

This will start the server that powers the machine learning predictions.

> The backend will wait for requests from the frontend and return fish location predictions.

---

### 🌐 2. Start the Frontend (React)

In the frontend directory, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 Machine Learning Behind the Scenes

Fishy uses a trained ML model to analyze environmental features and estimate the likelihood of fish presence in a location. The model was trained on historical oceanographic data and can generalize predictions based on patterns like:

* Water temperature
* Salinity levels
* Ocean depth

---

## 💡 Why Fishy?

Whether you're a marine researcher, student, or curious explorer of ocean life, Fishy provides an engaging way to visualize how environmental factors affect fish behavior — powered by real data and machine learning.

---
